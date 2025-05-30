/**
 * Deposit handling logic
 *
 * This file handles the deposit process, including crypto address assignment
 * and automatic conversion to UBT.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { processDeposit, getCurrentUBTRate } = require('../utils/ubtExchange');

// @route   GET api/deposit/addresses
// @desc    Get user's deposit addresses
// @access  Private
//
// ======== THIS IS THE CORRECTED SECTION ========
router.get('/addresses', auth, async (req, res) => {
  try {
    // Fetch user and specifically select the walletAddresses
    const user = await User.findById(req.user.id).select('walletAddresses');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has the walletAddresses object and the addresses are assigned
    if (!user.walletAddresses || !user.walletAddresses.bitcoin || !user.walletAddresses.ethereum) {
      return res.status(400).json({ message: 'Crypto addresses not yet assigned to this user.' });
    }

    // Return addresses from the correct location in the User model
    return res.json({
      btcAddress: user.walletAddresses.bitcoin,
      ethAddress: user.walletAddresses.ethereum,
      usdtAddress: user.walletAddresses.ethereum // USDT is an ERC20 token, using the ETH address
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});
// ======== END OF CORRECTED SECTION ========


// @route   GET api/deposit/balance
// @desc    Get user's UBT balance
// @access  Private
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get current UBT rate
    const currentRate = await getCurrentUBTRate();

    // Return only UBT balance, not individual crypto balances
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

  // Validate input
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
    // Process deposit
    const { ubtAmount, newBalance, newRate } = await processDeposit(
      req.user.id,
      cryptoType,
      parseFloat(amount)
    );

    // Create transaction record
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

module.exports = router;
