const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ExchangeRate = require('../models/ExchangeRate');
const { calculateUBTExchangeRate, calculateUBTBuyRate } = require('../utils/helpers');
const { sendWithdrawalNotification } = require('../utils/smsService');
const { sendWithdrawalNotificationEmail } = require('../utils/emailService');
const config = require('../config/config');

// @route   GET api/transactions
// @desc    Get user's transactions
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/transactions/deposit
// @desc    Record a deposit transaction
// @access  Private
router.post('/deposit', auth, async (req, res) => {
  const { currency, amount, txHash } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Validate currency
    if (!['BTC', 'ETH', 'USDT'].includes(currency)) {
      return res.status(400).json({ msg: 'Invalid currency' });
    }

    // Create transaction record
    const transaction = new Transaction({
      user: req.user.id,
      type: 'deposit',
      currency,
      amount,
      status: 'pending',
      txHash,
      description: `Deposit of ${amount} ${currency}`
    });

    await transaction.save();

    res.json({
      msg: 'Deposit recorded successfully',
      transaction
    });
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
      type: 'withdrawal',
      currency,
      amount,
      status: 'pending',
      walletAddress,
      exchangeRate,
      description: `Withdrawal request for ${amount} ${currency}`
    });

    await transaction.save();

    // Deduct from user's balance
    user.balances[balanceField] -= amount;
    await user.save();

    // Send notification to admin
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

    res.json({
      msg: 'Withdrawal request submitted successfully',
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

module.exports = router;
