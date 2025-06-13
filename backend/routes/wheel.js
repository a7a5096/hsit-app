// backend/routes/wheel.js
import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js'; // Assuming auth middleware path
import User from '../models/User.js';     // Assuming User model path
import Transaction from '../models/Transaction.js'; // Assuming Transaction model path

const router = express.Router();

// Define prizes in the order of the wheel segments (32 segments, equally likely)
const PRIZES = [
    { name: "A.I. BOT #5 (Value $3000)", type: "bot", message: "Unbelievable! You won A.I. BOT #5!" }, // 1 - yellow/green
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 2 - white
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 3 - black
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 4 - white
    { name: "10x Win", type: "multiplier", multiplier: 10, message: "Jackpot! You won 10x your bet!" }, // 5 - red
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 6 - black
    { name: "2x Win", type: "multiplier", multiplier: 2, message: "Great! You won 2x your bet!" }, // 7 - blue
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 8 - white
    { name: "2x Win", type: "multiplier", multiplier: 2, message: "Great! You won 2x your bet!" }, // 9 - blue
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 10 - black
    { name: "10x Win", type: "multiplier", multiplier: 10, message: "Jackpot! You won 10x your bet!" }, // 11 - red
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 12 - white
    { name: "2x Win", type: "multiplier", multiplier: 2, message: "Great! You won 2x your bet!" }, // 13 - blue
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 14 - black
    { name: "2x Win", type: "multiplier", multiplier: 2, message: "Great! You won 2x your bet!" }, // 15 - blue
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 16 - white
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 17 - black
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 18 - white
    { name: "2x Win", type: "multiplier", multiplier: 2, message: "Great! You won 2x your bet!" }, // 19 - blue
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 20 - black
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 21 - white
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 22 - black
    { name: "2x Win", type: "multiplier", multiplier: 2, message: "Great! You won 2x your bet!" }, // 23 - blue
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 24 - white
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 25 - black
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 26 - white
    { name: "10x Win", type: "multiplier", multiplier: 10, message: "Jackpot! You won 10x your bet!" }, // 27 - red
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 28 - black
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 29 - white
    { name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" },   // 30 - black
    { name: "10x Win", type: "multiplier", multiplier: 10, message: "Jackpot! You won 10x your bet!" }, // 31 - red
    { name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" }, // 32 - white
];

// Helper function to select a random segment (prize)
const selectPrize = () => {
    const index = Math.floor(Math.random() * PRIZES.length);
    return PRIZES[index];
};

// @route   GET api/wheel/balance
// @desc    Get user's UBT balance
// @access  Private
router.get('/balance', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Initialize balance if it doesn't exist
        if (!user.balances) {
            user.balances = { ubt: 0 };
        }
        user.balances.ubt = user.balances.ubt || 0;

        res.json({
            success: true,
            balance: user.balances.ubt
        });
    } catch (err) {
        console.error('Error fetching balance:', err.message);
        res.status(500).json({ success: false, message: 'Server error while fetching balance.' });
    }
});

// @route   POST api/wheel/spin
// @desc    Process a spin on the lucky wheel
// @access  Private
router.post('/spin', auth, async (req, res) => {
    const { betAmount } = req.body;
    let session;

    // 1. Validate betAmount
    if (typeof betAmount !== 'number' || betAmount < 0.5 || betAmount > 10) {
        return res.status(400).json({ success: false, message: 'Invalid bet amount. Must be between 0.5 and 10 UBT.' });
    }

    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const user = await User.findById(req.user.id).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Initialize balances if they don't exist
        if (!user.balances) {
            user.balances = { ubt: 0 };
        }
        user.balances.ubt = user.balances.ubt || 0;

        const initialBalance = user.balances.ubt;

        // 2. Check if user has sufficient UBT balance
        if (user.balances.ubt < betAmount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Insufficient UBT balance to place this bet.' });
        }

        // 3. Deduct bet amount
        user.balances.ubt -= betAmount;
        let creditsAdded = 0;
        let wasBotWon = false;
        let newBotStarted = false;

        // 4. Determine prize
        const prize = selectPrize();
        let prizeMessage = prize.message;

        // 5. Award prize and update balance
        if (prize.type === 'multiplier' && prize.multiplier > 0) {
            creditsAdded = betAmount * prize.multiplier;
            user.balances.ubt += creditsAdded;
        } else if (prize.type === 'bot') {
            wasBotWon = true;
            newBotStarted = true;
            // Add bot to user's account if you have a bots array
            if (!user.bots) user.bots = [];
            user.bots.push({
                name: 'AI Bot',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            });
        }

        const finalBalance = user.balances.ubt;

        // Create transaction record for the spin
        const spinTransaction = new Transaction({
            userId: user._id,
            txHash: `wheel_spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromAddress: user.walletAddresses.ubt || 'system',
            amount: betAmount,
            currency: 'UBT',
            ubtAmount: betAmount,
            status: 'completed',
            type: 'wager',
            description: `Wheel spin - ${prize.name}`
        });

        await spinTransaction.save({ session });

        // Create transaction record for the prize
        const prizeTransaction = new Transaction({
            userId: user._id,
            txHash: `wheel_prize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromAddress: 'system',
            amount: creditsAdded,
            currency: 'UBT',
            ubtAmount: creditsAdded,
            status: 'completed',
            type: 'reward',
            description: `Wheel prize - ${prize.name}`
        });

        await prizeTransaction.save({ session });

        await user.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: `Spin successful! ${prizeMessage}`,
            prize: prize.name,
            creditsAdded: creditsAdded,
            newBalance: finalBalance
        });

    } catch (err) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        console.error('Spinning wheel error:', err.message);
        res.status(500).json({ success: false, message: 'Server error during spin. Please try again.' });
    }
});

export default router;
