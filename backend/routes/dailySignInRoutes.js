import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import DailySignIn from '../models/DailySignIn.js';

const router = express.Router();

/**
 * @route   GET /api/daily-signin/status
 * @desc    Check if user has already signed in today
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    // Get user from database
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if user has already signed in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingSignIn = await DailySignIn.findOne({
      userId: user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    return res.json({
      success: true,
      hasSignedInToday: !!existingSignIn,
      lastSignIn: existingSignIn ? existingSignIn.date : null,
      consecutiveDays: existingSignIn ? existingSignIn.consecutiveDays : 0
    });
    
  } catch (error) {
    console.error('Error checking daily sign-in status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while checking sign-in status.' 
    });
  }
});

/**
 * @route   POST /api/daily-signin
 * @desc    Process daily sign-in and award UBT
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { reward } = req.body;
    
    // Validate reward amount
    const validatedReward = parseFloat(reward);
    if (isNaN(validatedReward) || validatedReward < 0.5 || validatedReward > 1.5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reward amount. Must be between 0.5-1.5 UBT.'
      });
    }
    
    // Get user from database
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if user has already signed in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingSignIn = await DailySignIn.findOne({
      userId: user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    if (existingSignIn) {
      return res.status(400).json({
        success: false,
        message: 'You have already signed in today.'
      });
    }
    
    // Check for previous day's sign-in to calculate consecutive days
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dayBefore = new Date(yesterday);
    dayBefore.setDate(dayBefore.getDate() - 1);
    
    const previousSignIn = await DailySignIn.findOne({
      userId: user._id,
      date: {
        $gte: dayBefore,
        $lt: today
      }
    }).sort({ date: -1 });
    
    let consecutiveDays = 1;
    if (previousSignIn) {
      // If previous sign-in was yesterday, increment consecutive days
      if (previousSignIn.date >= yesterday) {
        consecutiveDays = previousSignIn.consecutiveDays + 1;
      }
    }
    
    // Create new sign-in record
    const newSignIn = new DailySignIn({
      userId: user._id,
      date: Date.now(),
      reward: validatedReward,
      consecutiveDays: consecutiveDays
    });
    
    await newSignIn.save();
    
    // Create reward transaction
    const rewardTransaction = new Transaction({
      userId: user._id,
      type: 'reward',
      amount: validatedReward,
      currency: 'ubt',
      description: `Daily sign-in reward (Day ${consecutiveDays})`,
      status: 'completed',
      date: Date.now()
    });
    
    await rewardTransaction.save();
    
    // Calculate current balance
    const transactions = await Transaction.find({ 
      userId: user._id,
      currency: 'ubt'
    });
    
    let balance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'deposit' || transaction.type === 'reward') {
        balance += transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'wager') {
        balance -= transaction.amount;
      }
    });
    
    // Return updated user data
    res.json({
      success: true,
      message: 'Daily sign-in successful!',
      userData: {
        id: user._id,
        username: user.username,
        email: user.email,
        balances: {
          ubt: balance
        },
        lastSignIn: newSignIn.date,
        consecutiveDays: newSignIn.consecutiveDays
      }
    });
    
  } catch (error) {
    console.error('Error processing daily sign-in:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during daily sign-in.' 
    });
  }
});

export default router;
