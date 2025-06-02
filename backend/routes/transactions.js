import express from 'express';
import authMiddleware from '../middleware/auth.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { sendWithdrawalNotificationEmail } from '../utils/emailService.js';
// Corrected import name from smsService.js
import { sendWithdrawalNotificationSms } from '../utils/smsService.js'; 
import { ObjectId } from 'mongodb';

const router = express.Router();

// @route   POST api/transactions/withdrawal
// @desc    Create a new withdrawal request
// @access  Private
router.post('/withdrawal', authMiddleware, async (req, res) => {
  try {
    const { amount, currency, walletAddress } = req.body;
    const userId = req.user.id;

    // Basic validation
    if (!amount || !currency || !walletAddress) {
      return res.status(400).json({ success: false, message: 'Amount, currency, and wallet address are required.' });
    }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Check user balance (simplified - assumes balances are directly on user model for now)
    // You might have a more complex balance calculation involving transactions or a separate balances collection
    let currentBalance = 0;
    if (currency.toUpperCase() === 'BTC' && user.balances) currentBalance = user.balances.bitcoin || 0;
    else if (currency.toUpperCase() === 'ETH' && user.balances) currentBalance = user.balances.ethereum || 0;
    else if (currency.toUpperCase() === 'USDT' && user.balances) currentBalance = user.balances.usdt || 0;
    else if (currency.toUpperCase() === 'UBT' && user.balances) currentBalance = user.balances.ubt || 0;
    else {
        return res.status(400).json({ success: false, message: 'Unsupported currency for withdrawal.'});
    }
    
    if (currentBalance < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: `Insufficient ${currency} balance.` });
    }

    // Create and save the withdrawal transaction
    const transaction = new Transaction({
      userId,
      type: 'withdrawal',
      amount: parseFloat(amount),
      currency,
      status: 'pending', // Withdrawals are pending until processed by admin
      description: `Withdrawal of ${amount} ${currency} to ${walletAddress}`,
      relatedAddress: walletAddress
    });
    await transaction.save();

    // Send notification email to admin
    try {
      await sendWithdrawalNotificationEmail({
        userId,
        username: user.username,
        amount: parseFloat(amount),
        currency,
        walletAddress
      });
    } catch (emailError) {
        console.error("Failed to send withdrawal notification email:", emailError);
        // Continue even if email fails, but log it.
    }
    
    // Send notification SMS to admin (using the corrected function name)
    try {
      await sendWithdrawalNotificationSms({ // Corrected function call
        userId,
        username: user.username,
        amount: parseFloat(amount),
        currency,
        walletAddress
      });
    } catch (smsError) {
        console.error("Failed to send withdrawal notification SMS:", smsError);
        // Continue even if SMS fails, but log it.
    }


    // For now, do not deduct balance until admin approves.
    // When admin approves, a separate process will update the transaction status to 'completed'
    // and adjust the user's balance.

    res.status(201).json({ 
        success: true, 
        message: 'Withdrawal request submitted successfully. It will be processed by an administrator.',
        transaction 
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Server error during withdrawal request.' });
  }
});


// @route   GET api/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1 }) // Sort by most recent
      .limit(50); // Limit to last 50 transactions for performance

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching transactions.' });
  }
});

// @route   GET api/transactions/:id
// @desc    Get a specific transaction by ID
// @access  Private 
// (Ensuring user can only access their own transactions)
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        if (!ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid transaction ID format.' });
        }

        const transaction = await Transaction.findOne({ 
            _id: req.params.id, 
            userId: req.user.id 
        });

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found or access denied.' });
        }

        res.json({ success: true, transaction });
    } catch (error) {
        console.error('Error fetching transaction by ID:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching transaction.' });
    }
});


export default router;
