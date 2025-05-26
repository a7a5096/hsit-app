/**
 * Updated deposit route to use the correct wallet address fields
 * from the User model's walletAddresses object
 */
import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import addressAssignmentService from '../services/addressAssignmentService.js';
import depositTrackingService from '../services/depositTrackingService.js';
import { getCurrentUBTRate } from '../utils/ubtExchange.js';

const router = express.Router();

// @route   GET api/deposit/addresses
// @desc    Get user's deposit addresses
// @access  Private
router.get('/addresses', auth, async (req, res) => {
  try {
    // Get addresses from the service
    const addresses = await addressAssignmentService.getUserAddresses(req.user.id);
    
    return res.json({
      btcAddress: addresses.BTC,
      ethAddress: addresses.ETH,
      usdtAddress: addresses.USDT
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

// @route   GET api/deposit/history
// @desc    Get user's deposit history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const deposits = await depositTrackingService.getUserDeposits(req.user.id);
    return res.json(deposits);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/deposit/record
// @desc    Record a deposit
// @access  Private
router.post('/record', auth, async (req, res) => {
  const { txHash, toAddress, fromAddress, amount, currency } = req.body;
  
  // Validate input
  if (!txHash || !toAddress || !fromAddress || !amount || !currency) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }
  
  if (!['BTC', 'ETH', 'USDT'].includes(currency.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid currency' });
  }
  
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number' });
  }
  
  try {
    // Record the deposit
    const transaction = await depositTrackingService.recordDeposit({
      userId: req.user.id,
      txHash,
      toAddress,
      fromAddress,
      amount: parseFloat(amount),
      currency: currency.toUpperCase()
    });
    
    return res.json({
      message: 'Deposit recorded successfully',
      transaction
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.message.includes('does not belong') || 
        err.message.includes('already processed')) {
      return res.status(400).json({ message: err.message });
    }
    
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
    // Get user's address for this currency
    const addresses = await addressAssignmentService.getUserAddresses(req.user.id);
    const toAddress = addresses[cryptoType.toUpperCase()];
    
    if (!toAddress) {
      return res.status(400).json({ message: 'No address found for this currency' });
    }
    
    // Generate a fake transaction hash
    const txHash = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Record the deposit
    const transaction = await depositTrackingService.recordDeposit({
      userId: req.user.id,
      txHash,
      toAddress,
      fromAddress: 'simulation_address',
      amount: parseFloat(amount),
      currency: cryptoType.toUpperCase()
    });
    
    return res.json({
      message: `Deposit of ${amount} ${cryptoType.toUpperCase()} recorded successfully`,
      transaction
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
