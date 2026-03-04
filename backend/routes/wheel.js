import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Prize pool of 100 entries.
// Lose tiers mirror win tiers (reciprocal multipliers & reciprocal odds).
// At max bet (50 UBT), the 10x slot becomes a Grand Prize (free bot).
//
// LOSE (88 slots, weighted by denominator: 10+5+3+2 = 20):
//   44 × 1/10  = 4.40    (keep 10% — most common)
//   22 × 1/5   = 4.40    (keep 20%)
//   13 × 1/3   = 4.33    (keep 33%)
//    9 × 1/2   = 4.50    (keep 50% — least common)
//
// WIN (12 slots):
//    5 × 2     = 10
//    4 × 3     = 12
//    2 × 5     = 10
//    1 × 10    = 10      (or Grand Prize bot at max bet)
//                  ----
//   Total ≈ 59.63 / 100 = 0.596 EV  →  house keeps ~40%
const MAX_BET = 50;

const createPrizePool = () => {
    const prizes = [];

    // 1 × 10x / Grand Prize (1%)
    // At max bet this becomes a bot award; otherwise 10x UBT
    prizes.push({
        name: "10x Win",
        type: "jackpot",
        multiplier: 10,
        message: "JACKPOT! You won 10x your bet!"
    });

    // 2 × 5x Win (2%)
    for (let i = 0; i < 2; i++) {
        prizes.push({
            name: "5x Win",
            type: "multiplier",
            multiplier: 5,
            message: "Big win! You won 5x your bet!"
        });
    }

    // 4 × 3x Win (4%)
    for (let i = 0; i < 4; i++) {
        prizes.push({
            name: "3x Win",
            type: "multiplier",
            multiplier: 3,
            message: "Nice! You won 3x your bet!"
        });
    }

    // 5 × 2x Win (5%)
    for (let i = 0; i < 5; i++) {
        prizes.push({
            name: "2x Win",
            type: "multiplier",
            multiplier: 2,
            message: "Great! You doubled your bet!"
        });
    }

    // 44 × Lose — keep 1/10 (44%)
    for (let i = 0; i < 44; i++) {
        prizes.push({
            name: "Lose",
            type: "multiplier",
            multiplier: 0.1,
            message: "You kept 10% of your wager."
        });
    }

    // 22 × Lose — keep 1/5 (22%)
    for (let i = 0; i < 22; i++) {
        prizes.push({
            name: "Small Return",
            type: "multiplier",
            multiplier: 0.2,
            message: "You kept 20% of your wager."
        });
    }

    // 13 × Lose — keep 1/3 (13%)
    for (let i = 0; i < 13; i++) {
        prizes.push({
            name: "Partial Return",
            type: "multiplier",
            multiplier: 1/3,
            message: "You kept a third of your wager."
        });
    }

    // 9 × Lose — keep 1/2 (9%)
    for (let i = 0; i < 9; i++) {
        prizes.push({
            name: "Half Back",
            type: "multiplier",
            multiplier: 0.5,
            message: "You kept half your wager."
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

        // Deduct the full wager up front
        user.balances.ubt -= betAmount;

        let creditsAdded = 0;
        let wasBotWon = false;

        const prize = selectPrize();
        let prizeName = prize.name;
        let prizeMessage = prize.message;

        // Jackpot slot: at max bet it awards a Grand Prize bot instead of 10x UBT
        if (prize.type === 'jackpot' && betAmount === MAX_BET) {
            wasBotWon = true;
            prizeName = "Grand Prize - A.I. BOT #3";
            prizeMessage = "GRAND PRIZE! You won a free A.I. BOT #3 (600 UBT value)!";

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
        } else {
            // All other outcomes (including jackpot at non-max bet) pay the multiplier
            const multiplier = prize.type === 'jackpot' ? prize.multiplier : prize.multiplier;
            creditsAdded = Math.round(betAmount * multiplier * 100) / 100;
            user.balances.ubt += creditsAdded;
        }

        const finalBalance = user.balances.ubt;

        // Wager transaction
        const spinTransaction = new Transaction({
            userId: user._id,
            txHash: `wheel_spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromAddress: user.walletAddresses?.ubt || 'system',
            amount: betAmount,
            currency: 'UBT',
            ubtAmount: betAmount,
            status: 'completed',
            type: 'wager',
            description: `Wheel spin - ${prizeName}`
        });
        await spinTransaction.save({ session });

        // Prize / return transaction (even lose-half returns something)
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
                description: `Wheel prize - ${prizeName}`
            });
            await prizeTransaction.save({ session });
        }

        await user.save({ session });
        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: `Spin successful! ${prizeMessage}`,
            prize: prizeName,
            creditsAdded,
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
