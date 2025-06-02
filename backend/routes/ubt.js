import express from 'express';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import ExchangeRate from '../models/ExchangeRate.js'; // If you use this for UBT/USDT rate
import { sendUbtWithdrawalRequestToAdmin } from '../utils/emailService.js'; // Import new email function
// import { sendExchangeNotificationEmail } from '../utils/emailService.js'; // Already there for exchange

const router = express.Router();

// @route   POST api/ubt/exchange
// @desc    Exchange UBT for USDT or vice-versa
// @access  Private
router.post('/exchange', authMiddleware, async (req, res) => {
    // ... your existing exchange logic ...
    // Ensure it fetches user, checks balances, updates balances, saves user, creates transactions
    // and potentially sends an exchange notification email as per your sendExchangeNotificationEmail function.
});


// @route   POST api/ubt/request-withdrawal
// @desc    Request to withdraw UBT to an external BTC, ETH, or USDT address
// @access  Private
router.post('/request-withdrawal', authMiddleware, async (req, res) => {
    const { amount, destinationCurrency, destinationAddress } = req.body;
    const userId = req.user.id;

    // Validate input
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
    }
    if (!['BTC', 'ETH', 'USDT'].includes(destinationCurrency.toUpperCase())) {
        return res.status(400).json({ success: false, message: 'Invalid destination currency.' });
    }
    if (!destinationAddress || typeof destinationAddress !== 'string' || destinationAddress.trim() === '') {
        return res.status(400).json({ success: false, message: 'Destination address is required.' });
    }
    // Add more robust address validation here based on currency if needed

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Ensure balances object and ubt field exist
        if (!user.balances || typeof user.balances.ubt !== 'number') {
            user.balances = { ubt: 0, ...(user.balances || {}) }; // Initialize if needed
        }

        // Check sufficient UBT balance
        if (user.balances.ubt < withdrawalAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient UBT balance for withdrawal.' });
        }

        // Deduct UBT from user's balance and mark for pending withdrawal
        user.balances.ubt -= withdrawalAmount;
        // Optionally, you might have a separate 'pendingWithdrawalUbt' field
        // user.pendingWithdrawalUbt = (user.pendingWithdrawalUbt || 0) + withdrawalAmount;

        // Create a transaction record for the withdrawal request
        const withdrawalTransaction = new Transaction({
            userId,
            type: 'withdrawal_request', // Or 'withdrawal' with status 'pending'
            amount: -withdrawalAmount, // Negative as it's a debit from UBT balance
            currency: 'UBT',
            status: 'pending', // Admin needs to process this
            description: `UBT Withdrawal Request: ${withdrawalAmount} UBT to ${destinationCurrency.toUpperCase()} address ${destinationAddress}`,
            relatedAddress: destinationAddress,
            metadata: { // Store extra info if needed
                destinationCurrency: destinationCurrency.toUpperCase(),
                requestedAmountInUBT: withdrawalAmount
            }
        });

        await withdrawalTransaction.save();
        await user.save();

        // Send email notification to admin
        try {
            await sendUbtWithdrawalRequestToAdmin({
                username: user.username,
                userId: user._id.toString(),
                amount: withdrawalAmount,
                destinationCurrency: destinationCurrency.toUpperCase(),
                destinationAddress
            });
        } catch (emailError) {
            console.error(`Failed to send withdrawal request email for user ${userId}:`, emailError);
            // Do not fail the entire request if email fails, but log it.
        }

        res.json({ 
            success: true, 
            message: 'Withdrawal request submitted successfully. It will be processed within 48 hours.',
            newUbtBalance: user.balances.ubt 
        });

    } catch (error) {
        console.error('Error processing UBT withdrawal request:', error);
        res.status(500).json({ success: false, message: 'Server error during withdrawal request.' });
    }
});


export default router;
