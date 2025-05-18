const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth'); // Assuming auth middleware is in middleware/auth.js
const User = require('../models/User'); // Assuming User model is in models/User.js

const router = express.Router();

// @route   POST api/daily-signin
// @desc    Process daily sign-in and award UBT
// @access  Private
router.post('/', auth, async (req, res) => {
    const { reward, consecutiveDays } = req.body;

    if (reward === undefined || reward === null || typeof reward !== 'number' || reward <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid reward amount provided.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Update UBT balance
        user.balances.ubt = (user.balances.ubt || 0) + reward;
        
        // Potentially update consecutive days or other related stats if your User model supports it
        // For example: user.consecutiveSignInDays = consecutiveDays;

        await user.save();

        // Return success and updated user data (specifically balances for now)
        res.json({
            success: true,
            message: `Successfully signed in! You earned ${reward} UBT. Consecutive days: ${consecutiveDays || 1}.`,
            userData: {
                id: user.id,
                username: user.username,
                email: user.email,
                balances: user.balances,
                // Include other fields from User model as needed by dailySignIn.js
            }
        });

    } catch (err) {
        console.error('Daily sign-in error:', err.message);
        res.status(500).json({ success: false, message: 'Server error during daily sign-in.' });
    }
});

module.exports = router;
