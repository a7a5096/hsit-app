import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// @route   POST api/daily-signin
// @desc    Process daily sign-in and award UBT
// @access  Private
router.post('/', auth, async (req, res) => {
    const { reward, consecutiveDays } = req.body;

    try {
        console.log(`Daily sign-in attempt for user: ${req.user.id}, reward: ${reward}, consecutiveDays: ${consecutiveDays}`);
        
        // Validate reward
        if (reward === undefined || reward === null || typeof reward !== 'number' || reward <= 0) {
            console.log(`Daily sign-in failed: Invalid reward amount: ${reward}`);
            return res.status(400).json({ success: false, message: 'Invalid reward amount provided.' });
        }

        // Find user
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log(`Daily sign-in failed: User not found: ${req.user.id}`);
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Ensure user has balances object
        if (!user.balances) {
            console.log(`Fixing missing balances for user: ${user.id}`);
            user.balances = {
                btc: 0,
                eth: 0,
                usdt: 0,
                ubt: 0
            };
        }

        // Ensure UBT balance exists and is a number
        if (typeof user.balances.ubt !== 'number') {
            console.log(`Fixing invalid UBT balance for user: ${user.id}, current value: ${user.balances.ubt}`);
            user.balances.ubt = 0;
        }

        // Update UBT balance
        const previousBalance = user.balances.ubt;
        user.balances.ubt += reward;
        
        console.log(`Daily sign-in: Updated UBT balance for user ${user.id} from ${previousBalance} to ${user.balances.ubt}`);

        // Save user with updated balance
        await user.save();

        // Return success and updated user data
        res.json({
            success: true,
            message: `Successfully signed in! You earned ${reward} UBT. Consecutive days: ${consecutiveDays || 1}.`,
            userData: {
                id: user.id,
                username: user.username,
                email: user.email,
                balances: user.balances
            }
        });

    } catch (err) {
        console.error('Daily sign-in error details:', err);
        res.status(500).json({ success: false, message: 'Server error during daily sign-in.' });
    }
});

export default router;
