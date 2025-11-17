// backend/routes/wheel.js
import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js'; // Assuming auth middleware path
import User from '../models/User.js';     // Assuming User model path
import Transaction from '../models/Transaction.js'; // Assuming Transaction model path

const router = express.Router();

// Define prizes for 100 gift boxes with new probability distribution
// Distribution: 1% Grand Prize, 9% 10x Win, 21% 2x Win, 35% 1x Win, 34% Lose
const createPrizePool = () => {
    const prizes = [];
    
    // 1 Grand Prize (1%)
    prizes.push({ name: "A.I. BOT #5 (Value $3000)", type: "bot", message: "Unbelievable! You won A.I. BOT #5!" });
    
    // 9 10x Wins (9%)
    for (let i = 0; i < 9; i++) {
        prizes.push({ name: "10x Win", type: "multiplier", multiplier: 10, message: "Jackpot! You won 10x your bet!" });
    }
    
    // 21 2x Wins (21%)
    for (let i = 0; i < 21; i++) {
        prizes.push({ name: "2x Win", type: "multiplier", multiplier: 2, message: "Great! You won 2x your bet!" });
    }
    
    // 35 1x Wins (35%)
    for (let i = 0; i < 35; i++) {
        prizes.push({ name: "1x Win", type: "multiplier", multiplier: 1, message: "You won 1x your bet!" });
    }
    
    // 34 Loses (34%)
    for (let i = 0; i < 34; i++) {
        prizes.push({ name: "Lose", type: "multiplier", multiplier: 0, message: "Sorry, no prize this time!" });
    }
    
    return prizes;
};

const PRIZES = createPrizePool();

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
    if (typeof betAmount !== 'number' || betAmount < 10 || betAmount > 50) {
        return res.status(400).json({ success: false, message: 'Invalid bet amount. Must be between 10 and 50 UBT.' });
    }
    
    // Ensure bet amount is one of the allowed values: 10, 20, 30, 40, 50
    const allowedBets = [10, 20, 30, 40, 50];
    if (!allowedBets.includes(betAmount)) {
        return res.status(400).json({ success: false, message: 'Invalid bet amount. Must be 10, 20, 30, 40, or 50 UBT.' });
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
