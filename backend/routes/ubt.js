import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

/**
 * @route   GET /api/ubt/balance
 * @desc    Get user's UBT balance
 * @access  Private
 */
router.get('/balance', auth, async (req, res) => {
  try {
    // Get user from database
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Get user's transactions to calculate balance
    const transactions = await Transaction.find({ 
      userId: user._id,
      currency: 'ubt'
    });
    
    // Calculate UBT balance from transactions
    let balance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'deposit' || transaction.type === 'reward') {
        balance += transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'wager') {
        balance -= transaction.amount;
      }
    });
    
    // Return balance
    res.json({
      success: true,
      balance: balance
    });
    
  } catch (error) {
    console.error('Error fetching UBT balance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

/**
 * @route   POST /api/ubt/spin
 * @desc    Process a spin wager and determine outcome
 * @access  Private
 */
router.post('/spin', auth, async (req, res) => {
  try {
    const { wager } = req.body;
    
    // Validate wager amount
    if (!wager || isNaN(wager) || wager < 1 || wager > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wager amount. Must be between 1-100 UBT.'
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
    
    // Calculate current balance
    const transactions = await Transaction.find({ 
      userId: user._id,
      currency: 'ubt'
    });
    
    let currentBalance = 0;
    transactions.forEach(transaction => {
      if (transaction.type === 'deposit' || transaction.type === 'reward') {
        currentBalance += transaction.amount;
      } else if (transaction.type === 'withdrawal' || transaction.type === 'wager') {
        currentBalance -= transaction.amount;
      }
    });
    
    // Check if user has enough balance
    if (currentBalance < wager) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient UBT balance for this wager.'
      });
    }
    
    // Create wager transaction
    const wagerTransaction = new Transaction({
      userId: user._id,
      type: 'wager',
      amount: wager,
      currency: 'ubt',
      description: 'Spinning wheel wager',
      status: 'completed',
      date: Date.now()
    });
    
    await wagerTransaction.save();
    
    // Calculate balance after wager
    const balanceAfterWager = currentBalance - wager;
    
    // Determine spin outcome
    // Define prize segments (matching frontend)
    const prizes = [
      { text: "10 UBT", color: "#FFC300", value: 10 },
      { text: "Try Again", color: "#C70039", value: 0 },
      { text: "5 UBT", color: "#900C3F", value: 5 },
      { text: "20 UBT", color: "#581845", value: 20 },
      { text: "Bonus Spin", color: "#FF5733", value: "bonus" },
      { text: "2 UBT", color: "#DAF7A6", value: 2 },
      { text: "50 UBT", color: "#3498DB", value: 50 },
      { text: "Jackpot!", color: "#2ECC71", value: 100 }
    ];
    
    // Randomly select a segment (weighted if needed)
    const winningSegmentIndex = Math.floor(Math.random() * prizes.length);
    const winningPrize = prizes[winningSegmentIndex];
    
    let prizeAmount = 0;
    
    // Process the prize
    if (winningPrize.value === "bonus") {
      // For bonus spin, we'll give a fixed amount for now
      prizeAmount = 5; // 5 UBT for bonus spin
    } else if (typeof winningPrize.value === 'number') {
      prizeAmount = winningPrize.value;
    }
    
    // If there's a prize to award
    if (prizeAmount > 0) {
      // Create prize transaction
      const prizeTransaction = new Transaction({
        userId: user._id,
        type: 'reward',
        amount: prizeAmount,
        currency: 'ubt',
        description: `Spinning wheel prize: ${winningPrize.text}`,
        status: 'completed',
        date: Date.now()
      });
      
      await prizeTransaction.save();
    }
    
    // Calculate final balance
    const finalBalance = balanceAfterWager + prizeAmount;
    
    // Return the result
    res.json({
      success: true,
      winningSegmentIndex,
      prizeText: winningPrize.text,
      prizeValue: winningPrize.value,
      balanceAfterWager,
      finalBalance
    });
    
  } catch (error) {
    console.error('Error processing spin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

export default router;
