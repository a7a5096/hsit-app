// backend/routes/wheel.js
import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js'; // Assuming auth middleware path
import User from '../models/User.js';     // Assuming User model path
import Transaction from '../models/Transaction.js'; // Assuming Transaction model path

const router = express.Router();

// Define prizes and their weights (probabilities)
const PRIZES = [
    { name: 'Black', multiplier: 0, weight: 21.9, message: 'You landed on Black. No prize this time!' },
    { name: 'Blue', multiplier: 2, weight: 21.9, message: 'You landed on Blue! You won back your bet!' },
    { name: 'White', multiplier: 1, weight: 37.5, message: 'Amazing! You landed on White and won 5x your bet!' },
    { name: 'Red', multiplier: 10, weight: 17.7, message: 'Jackpot! You landed on Red and won 10x your bet!' },
    { name: 'GOLD', multiplier: 0, weight: 1, message: 'Unbelievable! You won a FREE UBT Bot #5!', isBot: true }
];

// Helper function to select a prize based on weights
const selectPrize = () => {
    let totalWeight = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
    let randomNumber = Math.random() * totalWeight;

    for (let i = 0; i < PRIZES.length; i++) {
        randomNumber -= PRIZES[i].weight;
        if (randomNumber <= 0) {
            return PRIZES[i];
        }
    }
    // Fallback, should not happen if weights sum up correctly
    return PRIZES[0]; // Default to Black if something goes wrong
};

// @route   POST api/wheel/spin
// @desc    Process a spin on the lucky wheel
// @access  Private
router.post('/spin', auth, async (req, res) => {
    const { betAmount } = req.body;
    let session; // Declare session variable outside try-catch for wider scope

    // 1. Validate betAmount
    if (typeof betAmount !== 'number' || betAmount < 0.5 || betAmount > 10) {
        return res.status(400).json({ success: false, message: 'Invalid bet amount. Must be between 0.5 and 10 UBT.' });
    }

    try {
        // Start Mongoose session for atomicity (ensures all or nothing for balance and transaction updates)
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
        user.balances.ubt = user.balances.ubt || 0; // Ensure ubt is a number

        // Record initial balance for transaction log
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
        if (prize.multiplier > 0) {
            creditsAdded = betAmount * prize.multiplier;
            user.balances.ubt += creditsAdded;
        } else if (prize.isBot) {
            wasBotWon = true;
            newBotStarted = true; // Assuming winning the bot immediately starts it or registers it for activation
            // Placeholder: If you have a specific way to track bots on the user model,
            // you would update it here (e.g., user.bots.push({ name: 'UBT Bot #5', status: 'active' }));
            // As per our discussion, I'm just setting flags for the transaction log.
        }

        const finalBalance = user.balances.ubt;

        // 6. Create transaction record
        const transaction = new Transaction({
            user: user._id,
            type: 'wheel_spin',
            amount: -betAmount, // Negative for the cost of the spin
            asset: 'ubt',
            status: 'completed',
            details: {
                initial_balance: initialBalance,
                bet: betAmount,
                spin_result: prize.name,
                credits_added: creditsAdded,
                final_balance: finalBalance,
                was_bot_won: wasBotWon,
                new_bot_started: newBotStarted,
                prize_message: prizeMessage
            },
            date: new Date()
        });

        // Save user and transaction within the session
        await user.save({ session });
        await transaction.save({ session });

        // Commit the transaction
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
