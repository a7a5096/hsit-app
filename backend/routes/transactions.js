import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import ExchangeRate from '../models/ExchangeRate.js';
import config from '../config/config.js';
import { sendWithdrawalNotification } from '../utils/smsService.js';
import { sendWithdrawalNotificationEmail, sendExchangeNotificationEmail } from '../utils/emailService.js';

const router = express.Router();

// Helper functions for UBT exchange rate calculations
function calculateUBTExchangeRate(withdrawalCount, initialRate, increaseAmount) {
  return initialRate + (withdrawalCount * increaseAmount);
}

function calculateUBTBuyRate(sellRate, buyRateFactor) {
  return sellRate * buyRateFactor;
}

// @route   GET api/transactions
// @desc    Get all user transactions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/transactions/withdraw
// @desc    Request a withdrawal
// @access  Private
router.post('/withdraw', auth, async (req, res) => {
  const { currency, amount, walletAddress } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    // Validate currency
    if (!['BTC', 'ETH', 'USDT', 'UBT'].includes(currency)) {
      return res.status(400).json({ msg: 'Invalid currency' });
    }
    // Check if user has sufficient balance
    const balanceField = currency.toLowerCase();
    if (user.balances[balanceField] < amount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }
    
    // Check if this is an internal exchange (UBT to USDT)
    const isInternalExchange = walletAddress === 'INTERNAL_EXCHANGE' && currency === 'UBT';
    
    // If withdrawing UBT, update exchange rate
    let exchangeRate = null;
    if (currency === 'UBT') {
      // Get or create exchange rate record
      let rateRecord = await ExchangeRate.findOne({});
      if (!rateRecord) {
        rateRecord = new ExchangeRate({
          withdrawalCount: 0,
          currentRate: config.UBT_INITIAL_EXCHANGE_RATE,
          buyRate: config.UBT_INITIAL_EXCHANGE_RATE * config.UBT_BUY_RATE_FACTOR
        });
      }
      // Increment withdrawal count and update rates
      rateRecord.withdrawalCount += 1;
      rateRecord.currentRate = calculateUBTExchangeRate(
        rateRecord.withdrawalCount,
        config.UBT_INITIAL_EXCHANGE_RATE,
        config.UBT_EXCHANGE_RATE_INCREASE
      );
      rateRecord.buyRate = calculateUBTBuyRate(
        rateRecord.currentRate,
        config.UBT_BUY_RATE_FACTOR
      );
      rateRecord.lastUpdated = Date.now();
      
      await rateRecord.save();
      exchangeRate = rateRecord.currentRate;
    }
    
    // Create withdrawal transaction
    const transaction = new Transaction({
      user: req.user.id,
      type: isInternalExchange ? 'exchange' : 'withdrawal',
      currency,
      amount,
      status: 'pending',
      walletAddress,
      exchangeRate,
      description: isInternalExchange 
        ? `Exchange request for ${amount} ${currency} to USDT` 
        : `Withdrawal request for ${amount} ${currency}`
    });
    await transaction.save();
    
    // Deduct from user's balance
    user.balances[balanceField] -= amount;
    
    // If this is an internal exchange, create a corresponding USDT transaction
    if (isInternalExchange) {
      const usdtAmount = amount * exchangeRate;
      
      // Create USDT transaction (pending until admin approves)
      const usdtTransaction = new Transaction({
        user: req.user.id,
        type: 'exchange',
        currency: 'USDT',
        amount: usdtAmount,
        status: 'pending',
        exchangeRate,
        description: `Pending receipt of ${usdtAmount.toFixed(2)} USDT from ${amount} UBT exchange`
      });
      
      await usdtTransaction.save();
      
      // Send exchange notification to admin
      const exchangeData = {
        userId: user._id,
        username: user.username,
        fromAmount: amount,
        fromCurrency: 'UBT',
        toAmount: usdtAmount.toFixed(2),
        toCurrency: 'USDT'
      };
      
      // Send email notification for exchange
      await sendExchangeNotificationEmail(exchangeData);
    } else {
      // Send notification to admin for regular withdrawal
      const withdrawalData = {
        userId: user._id,
        username: user.username,
        amount,
        currency,
        walletAddress
      };
      
      // Send SMS notification
      await sendWithdrawalNotification(withdrawalData);
      
      // Send email notification
      await sendWithdrawalNotificationEmail(withdrawalData);
    }
    
    await user.save();
    
    res.json({
      msg: isInternalExchange ? 'Exchange request submitted successfully' : 'Withdrawal request submitted successfully',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/transactions/buy-ubt
// @desc    Buy UBT with crypto balance
// @access  Private
router.post('/buy-ubt', auth, async (req, res) => {
  const { sourceCurrency, amount } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    // Validate source currency
    if (!['BTC', 'ETH', 'USDT'].includes(sourceCurrency)) {
      return res.status(400).json({ msg: 'Invalid source currency' });
    }
    // Check if user has sufficient balance
    const balanceField = sourceCurrency.toLowerCase();
    if (user.balances[balanceField] < amount) {
      return res.status(400).json({ msg: 'Insufficient balance' });
    }
    // Get current UBT buy rate
    let rateRecord = await ExchangeRate.findOne({});
    if (!rateRecord) {
      rateRecord = new ExchangeRate({
        withdrawalCount: 0,
        currentRate: config.UBT_INITIAL_EXCHANGE_RATE,
        buyRate: config.UBT_INITIAL_EXCHANGE_RATE * config.UBT_BUY_RATE_FACTOR
      });
      await rateRecord.save();
    }
    // Calculate UBT amount based on buy rate
    const ubtAmount = amount / rateRecord.buyRate;
    // Create transaction records
    const sourceTransaction = new Transaction({
      user: req.user.id,
      type: 'exchange',
      currency: sourceCurrency,
      amount: -amount,
      status: 'completed',
      exchangeRate: rateRecord.buyRate,
      description: `Exchanged ${amount} ${sourceCurrency} for UBT`
    });
    const ubtTransaction = new Transaction({
      user: req.user.id,
      type: 'exchange',
      currency: 'UBT',
      amount: ubtAmount,
      status: 'completed',
      exchangeRate: rateRecord.buyRate,
      description: `Received ${ubtAmount.toFixed(2)} UBT from ${amount} ${sourceCurrency}`
    });
    
    // Update user balances
    user.balances[balanceField] -= amount;
    user.balances.ubt += ubtAmount;
    
    // Send exchange notification to admin
    const exchangeData = {
      userId: user._id,
      username: user.username,
      fromAmount: amount,
      fromCurrency: sourceCurrency,
      toAmount: ubtAmount.toFixed(2),
      toCurrency: 'UBT'
    };
    
    // Send email notification for exchange
    await sendExchangeNotificationEmail(exchangeData);
    
    // Save all changes
    await sourceTransaction.save();
    await ubtTransaction.save();
    await user.save();
    
    res.json({
      msg: 'UBT purchase successful',
      ubtAmount,
      exchangeRate: rateRecord.buyRate,
      transactions: [sourceTransaction, ubtTransaction]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/transactions/exchange-rates
// @desc    Get current UBT exchange rates
// @access  Public
router.get('/exchange-rates', async (req, res) => {
  try {
    let rateRecord = await ExchangeRate.findOne({});
    if (!rateRecord) {
      rateRecord = new ExchangeRate({
        withdrawalCount: 0,
        currentRate: config.UBT_INITIAL_EXCHANGE_RATE,
        buyRate: config.UBT_INITIAL_EXCHANGE_RATE * config.UBT_BUY_RATE_FACTOR
      });
      await rateRecord.save();
    }
    res.json({
      sellRate: rateRecord.currentRate,
      buyRate: rateRecord.buyRate,
      withdrawalCount: rateRecord.withdrawalCount,
      lastUpdated: rateRecord.lastUpdated
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;
