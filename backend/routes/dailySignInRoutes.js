import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js'; // Updated import path with .js extension
import User from '../models/User.js'; // Updated import path with .js extension
const router = express.Router();
// @route   POST api/daily-signin
// @desc    Process daily sign-in and award UBT
// @access  Private
router.post('/', auth, async (req, res) => {
    let { reward, consecutiveDays } = req.body;
    
    // Parse reward to ensure it's a number regardless of input type
    try {
        reward = parseFloat(reward);
        if (isNaN(reward) || reward <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid reward amount provided. Must be a positive number.' 
            });
        }
    } catch (error) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid reward format. Must be a valid number.' 
        });
    }
    
    // Parse consecutiveDays if provided
    if (consecutiveDays !== undefined) {
        try {
            consecutiveDays = parseInt(consecutiveDays);
            if (isNaN(consecutiveDays) || consecutiveDays < 1) {
                consecutiveDays = 1; // Reset to default if invalid
            }
        } catch (error) {
            consecutiveDays = 1; // Default value if parsing fails
        }
    } else {
        consecutiveDays = 1; // Default value if not provided
    }
    
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        // Initialize balances object if it doesn't exist
        if (!user.balances) {
            user.balances = { ubt: 0 };
        }
        // Initialize dailySignIn object if it doesn't exist
        if (!user.dailySignIn) {
            user.dailySignIn = {
                lastSignInDate: null,
                consecutiveDays: 0,
                totalRewards: 0
            };
        }
        // Get current date (without time) for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Check if user has already signed in today
        const lastSignInDate = user.dailySignIn.lastSignInDate ? new Date(user.dailySignIn.lastSignInDate) : null;
        if (lastSignInDate) {
            lastSignInDate.setHours(0, 0, 0, 0);
            
            // If already signed in today, return error
            if (lastSignInDate.getTime() === today.getTime()) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'You have already signed in today.' 
                });
            }
            
            // Check if this is a consecutive day (yesterday)
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastSignInDate.getTime() === yesterday.getTime()) {
                // Consecutive day
                user.dailySignIn.consecutiveDays += 1;
            } else {
                // Not consecutive, reset counter
                user.dailySignIn.consecutiveDays = 1;
            }
        } else {
            // First time signing in
            user.dailySignIn.consecutiveDays = 1;
        }
        // Update UBT balance - safely access and update
        user.balances.ubt = (user.balances.ubt || 0) + reward;
        
        // Update daily sign-in tracking
        user.dailySignIn.lastSignInDate = new Date();
        user.dailySignIn.totalRewards = (user.dailySignIn.totalRewards || 0) + reward;
        await user.save();
        // Return success and updated user data
        res.json({
            success: true,
            message: `Successfully signed in! You earned ${reward.toFixed(2)} UBT. Consecutive days: ${user.dailySignIn.consecutiveDays}.`,
            userData: {
                id: user.id,
                username: user.username,
                email: user.email,
                balances: user.balances,
                dailySignIn: user.dailySignIn
            }
        });
    } catch (err) {
        console.error('Daily sign-in error:', err.message);
        res.status(500).json({ success: false, message: 'Server error during daily sign-in.' });
    }
});
export default router;
