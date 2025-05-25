import express from 'express';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * @route   GET /api/ubt/balance
 * @desc    Get user's UBT balance from database
 * @access  Private
 */
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize balances if it doesn't exist
    if (!user.balances) {
      user.balances = { ubt: 0 };
      await user.save();
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
 * @route   POST /api/ubt/spin
 * @desc    Process a wheel spin and update UBT balance
 * @access  Private
 */
router.post('/spin', authMiddleware, async (req, res) => {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Find user with session to lock the document
    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize balances if it doesn't exist
    if (!user.balances) {
      user.balances = { ubt: 0 };
    }
    
    // Define the segments
    const segments = [
      { label: "1 UBT", value: 1, currency: "ubt" },
      { label: "Sorry", value: 0, currency: "none" },
      { label: "20 USDT", value: 20, currency: "usdt" },
      { label: "Sorry", value: 0, currency: "none" },
      { label: "10 UBT", value: 10, currency: "ubt" },
      { label: "Sorry", value: 0, currency: "none" }
    ];
    
    // Determine the winning segment (random)
    const winningSegmentIndex = Math.floor(Math.random() * segments.length);
    const winningSegment = segments[winningSegmentIndex];
    
    // Update user's balance based on the winning segment
    if (winningSegment.currency === 'ubt') {
      user.balances.ubt = (user.balances.ubt || 0) + winningSegment.value;
    } else if (winningSegment.currency === 'usdt') {
      user.balances.usdt = (user.balances.usdt || 0) + winningSegment.value;
    }
    
    // Save user with updated balance
    await user.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    // Return the result
    res.json({
      success: true,
      result: {
        segmentIndex: winningSegmentIndex,
        prize: winningSegment.value > 0 ? `${winningSegment.value} ${winningSegment.currency.toUpperCase()}` : 'Nothing',
        newBalance: user.balances.ubt || 0
      }
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error processing wheel spin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while processing wheel spin',
      error: error.message
    });
  }
});

export default router;
