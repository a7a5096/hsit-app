import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import DailySignIn from '../models/DailySignIn.js';
const router = express.Router();
/**
 * @route   POST /api/daily-signin
 * @desc    Process daily sign-in and award UBT
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    // Extract and validate reward
    let { reward, consecutiveDays, currency = 'UBT' } = req.body;
    
    // Validate reward amount - ensure it's a valid number regardless of input type
    let validatedReward;
    try {
      validatedReward = parseFloat(reward);
      if (isNaN(validatedReward) || validatedReward < 0.5 || validatedReward > 1.5) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reward amount. Must be between 0.5-1.5 UBT.'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reward format. Must be a valid number.'
      });
    }
    
    // Validate consecutiveDays - ensure it's a valid number if provided
    let validatedConsecutiveDays = 1; // Default to 1 if not provided
    if (consecutiveDays !== undefined) {
      try {
        validatedConsecutiveDays = parseInt(consecutiveDays);
        if (isNaN(validatedConsecutiveDays) || validatedConsecutiveDays < 1) {
          validatedConsecutiveDays = 1; // Reset to default if invalid
        }
      } catch (error) {
        // Silently handle parsing errors by using the default value
        validatedConsecutiveDays = 1;
      }
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
    
    // Create new sign-in record
    const newSignIn = new DailySignIn({
      userId: user._id,
      date: Date.now(),
      reward: validatedReward,
      consecutiveDays: validatedConsecutiveDays
    });
    
    await newSignIn.save();
    
    // Ensure currency is uppercase to match schema enum
    const normalizedCurrency = currency.toUpperCase();
    
    // Create reward transaction with required fields
    const rewardTransaction = new Transaction({
      userId: user._id,
      type: 'reward',
      amount: validatedReward,
      currency: normalizedCurrency,
      description: `Daily sign-in reward (Day ${validatedConsecutiveDays})`,
      status: 'completed',
      fromAddress: 'system',  // Required field
      txHash: `signin_${user._id}_${Date.now()}`, // Required field - unique hash
      ubtAmount: validatedReward, // Required field - same as reward for UBT currency
      date: Date.now()
    });
    
    await rewardTransaction.save();
    
    // Calculate current balance
    const transactions = await Transaction.find({ 
      userId: user._id,
      currency: normalizedCurrency
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

/**
 * @route   GET /api/daily-signin/status
 * @desc    Check if user has already signed in today
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check for existing sign-in
    const existingSignIn = await DailySignIn.findOne({
      userId: req.user.id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    res.json({
      success: true,
      signedInToday: !!existingSignIn,
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

export default router;
