/**
 * Deposit handling logic
 */
import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { processDeposit, getCurrentUBTRate } from '../utils/ubtExchange.js';

const router = express.Router();

// @route   GET api/deposit/addresses
// @desc    Get user's deposit addresses
// @access  Private
router.get('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('walletAddresses');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.walletAddresses || !user.walletAddresses.bitcoin || !user.walletAddresses.ethereum) {
      return res.status(400).json({ message: 'Crypto addresses not yet assigned to this user.' });
    }
    return res.json({
      btcAddress: user.walletAddresses.bitcoin,
      ethAddress: user.walletAddresses.ethereum,
      usdtAddress: user.walletAddresses.ethereum
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET api/deposit/balance
// @desc    Get user's UBT balance
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const currentRate = await getCurrentUBTRate();
    return res.json({
      ubtBalance: user.balances.ubt,
      currentRate
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/deposit/simulate
// @desc    Simulate a deposit (for testing purposes)
// @access  Private
router.post('/simulate', auth, async (req, res) => {
  const { cryptoType, amount } = req.body;
  if (!cryptoType || !amount) {
    return res.status(400).json({ message: 'Please provide crypto type and amount' });
  }
  if (!['BTC', 'ETH', 'USDT'].includes(cryptoType.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid crypto type' });
  }
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }
  try {
    const { ubtAmount, newBalance, newRate } = await processDeposit(
      req.user.id,
      cryptoType,
      parseFloat(amount)
    );
    const transaction = new Transaction({
      user: req.user.id,
      type: 'deposit',
      cryptoType: cryptoType.toUpperCase(),
      cryptoAmount: parseFloat(amount),
      ubtAmount,
      ubtRate: newRate,
      status: 'completed'
    });
    await transaction.save();
    return res.json({
      message: `Deposit of ${amount} ${cryptoType.toUpperCase()} converted to ${ubtAmount.toFixed(2)} UBT`,
      ubtAmount,
      newBalance,
      newRate
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
