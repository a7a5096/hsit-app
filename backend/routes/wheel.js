import express from 'express';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

/**
 * Get user's UBT balance
 * @route   GET /api/wheel/balance
 * @desc    Get user's current UBT balance from database
 * @access  Private
 */
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Return UBT balance from database
    res.json({
      success: true,
      balance: user.balances.ubt || 0
    });
  } catch (error) {
    console.error('Error getting UBT balance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving UBT balance',
      error: error.message
    });
  }
});

/**
 * Spin the wheel
 * @route   POST /api/wheel/spin
 * @desc    Process a wheel spin, deduct cost, and award prize
 * @access  Private
 */
router.post('/spin', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if user has enough UBT to spin
    const spinCost = 1; // Cost in UBT to spin the wheel
    if ((user.balances.ubt || 0) < spinCost) {
      return res.status(400).json({ 
        success: false, 
        message: 'Insufficient UBT balance to spin the wheel' 
      });
    }
    
    // Define the segments and their probabilities
    const segments = [
      { label: "1 UBT", value: 1, currency: "ubt", probability: 0.15 },
      { label: "Sorry", value: 0, currency: "none", probability: 0.25 },
      { label: "20 USDT", value: 20, currency: "usdt", probability: 0.05 },
      { label: "Sorry", value: 0, currency: "none", probability: 0.25 },
      { label: "10 UBT", value: 10, currency: "ubt", probability: 0.05 },
      { label: "Sorry", value: 0, currency: "none", probability: 0.25 }
    ];
    
    // Determine the winning segment based on probabilities
    const random = Math.random();
    let cumulativeProbability = 0;
    let winningSegment = segments[segments.length - 1]; // Default to last segment
    
    for (let i = 0; i < segments.length; i++) {
      cumulativeProbability += segments[i].probability;
      if (random <= cumulativeProbability) {
        winningSegment = segments[i];
        break;
      }
    }
    
    // Deduct the spin cost from user's UBT balance
    user.balances.ubt -= spinCost;
    
    // Create transaction record for the spin cost
    const spinCostTransaction = new Transaction({
      user: user._id,
      type: 'debit',
      amount: spinCost,
      currency: 'ubt',
      description: 'Wheel spin cost',
      status: 'completed'
    });
    await spinCostTransaction.save();
    
    // If user won something, add it to their balance
    if (winningSegment.value > 0) {
      // Update user's balance based on the prize currency
      if (winningSegment.currency === 'ubt') {
        user.balances.ubt += winningSegment.value;
      } else if (winningSegment.currency === 'usdt') {
        user.balances.usdt = (user.balances.usdt || 0) + winningSegment.value;
      }
      
      // Create transaction record for the prize
      const prizeTransaction = new Transaction({
        user: user._id,
        type: 'credit',
        amount: winningSegment.value,
        currency: winningSegment.currency,
        description: 'Wheel spin prize',
        status: 'completed'
      });
      await prizeTransaction.save();
    }
    
    // Save the updated user balances
    await user.save();
    
    // Return the result
    res.json({
      success: true,
      message: 'Wheel spin processed successfully',
      result: {
        prize: winningSegment.label,
        value: winningSegment.value,
        currency: winningSegment.currency,
        newBalance: user.balances.ubt,
        segmentIndex: segments.indexOf(winningSegment)
      }
    });
  } catch (error) {
    console.error('Error processing wheel spin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while processing wheel spin',
      error: error.message
    });
  }
});

export default router;
