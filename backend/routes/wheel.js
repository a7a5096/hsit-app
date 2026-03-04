import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Prize pool of 100 entries.
// Player expected value per unit wagered = 0.43  →  house keeps 57%.
//
//   67 × 0  = 0       (Lose)
//   25 × 1  = 25      (1x – breakeven)
//    5 × 2  = 10      (2x)
//    1 × 3  = 3       (3x)
//    1 × 5  = 5       (5x)
//    1 × 0  = 0       (Grand Prize – bot, not UBT payout)
//                ----
//   Total = 43 / 100 = 0.43 EV
const createPrizePool = () => {
    const prizes = [];

    // 1 Grand Prize (1%) – awards a bot, no direct UBT return
    prizes.push({
        name: "A.I. BOT #3 (Value 600 UBT)",
        type: "bot",
        multiplier: 0,
        message: "Incredible! You won A.I. BOT #3!"
    });

    // 1 × 5x Win (1%)
    prizes.push({
        name: "5x Win",
        type: "multiplier",
        multiplier: 5,
        message: "Big win! You won 5x your bet!"
    });

    // 1 × 3x Win (1%)
    prizes.push({
        name: "3x Win",
        type: "multiplier",
        multiplier: 3,
        message: "Nice! You won 3x your bet!"
    });

    // 5 × 2x Win (5%)
    for (let i = 0; i < 5; i++) {
        prizes.push({
            name: "2x Win",
            type: "multiplier",
            multiplier: 2,
            message: "Great! You won 2x your bet!"
        });
    }

    // 25 × 1x Win (25%) – breakeven
    for (let i = 0; i < 25; i++) {
        prizes.push({
            name: "1x Win",
            type: "multiplier",
            multiplier: 1,
            message: "You got your bet back!"
        });
    }

    // 67 × Lose (67%)
    for (let i = 0; i < 67; i++) {
        prizes.push({
            name: "No Prize",
            type: "multiplier",
            multiplier: 0,
            message: "Better luck next time!"
        });
    }

    return prizes;
};

const PRIZES = createPrizePool();

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

        if (!user.balances) user.balances = { ubt: 0 };
        user.balances.ubt = user.balances.ubt || 0;

        res.json({ success: true, balance: user.balances.ubt });
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

    if (typeof betAmount !== 'number' || betAmount < 10 || betAmount > 50) {
        return res.status(400).json({ success: false, message: 'Invalid bet amount. Must be between 10 and 50 UBT.' });
    }

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

        if (!user.balances) user.balances = { ubt: 0 };
        user.balances.ubt = user.balances.ubt || 0;

        if (user.balances.ubt < betAmount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Insufficient UBT balance to place this bet.' });
        }

        user.balances.ubt -= betAmount;
        let creditsAdded = 0;
        let wasBotWon = false;

        const prize = selectPrize();
        let prizeMessage = prize.message;

        if (prize.type === 'multiplier' && prize.multiplier > 0) {
            creditsAdded = betAmount * prize.multiplier;
            user.balances.ubt += creditsAdded;
        } else if (prize.type === 'bot') {
            wasBotWon = true;
            if (!user.bots) user.bots = [];
            const completionDate = new Date();
            completionDate.setDate(completionDate.getDate() + 8);
            user.bots.push({
                botId: '3',
                name: 'UBT Bot #3',
                investmentAmount: 0,
                status: 'active',
                purchasedAt: new Date(),
                completionDate: completionDate,
                totalPayout: 648,
                payoutProcessed: false,
                lockInDays: 8,
                dailyCreditsProcessed: 0,
                bonusCreditsProcessed: 0,
                purchaseBonusAwarded: 0
            });
        }

        const finalBalance = user.balances.ubt;

        const spinTransaction = new Transaction({
            userId: user._id,
            txHash: `wheel_spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromAddress: user.walletAddresses?.ubt || 'system',
            amount: betAmount,
            currency: 'UBT',
            ubtAmount: betAmount,
            status: 'completed',
            type: 'wager',
            description: `Wheel spin - ${prize.name}`
        });
        await spinTransaction.save({ session });

        if (creditsAdded > 0 || wasBotWon) {
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
        }

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
