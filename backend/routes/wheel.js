import express from 'express';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js'; // Assuming path to your User model
import Transaction from '../models/Transaction.js'; // Assuming path to Transaction model

const router = express.Router();

const SPIN_COST = 10; // UBT cost per spin, must match frontend
const PRIZES = [ // Define possible prizes
    { name: "Jackpot!", amount: 100, weight: 1 },  // 100 UBT
    { name: "Big Win!", amount: 50, weight: 5 },    // 50 UBT
    { name: "Small Win", amount: 20, weight: 15 },  // 20 UBT (COST_PER_SPIN * 2)
    { name: "Free Spin", amount: 10, weight: 20 },  // Wins cost back
    { name: "Try Again", amount: 0, weight: 59 }   // No win
];

// Helper to select a prize based on weight
function selectPrize() {
    const totalWeight = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
    let random = Math.random() * totalWeight;
    for (const prize of PRIZES) {
        if (random < prize.weight) return prize;
        random -= prize.weight;
    }
    return PRIZES.find(p => p.amount === 0); // Fallback to "Try Again"
}

// @route   POST api/wheel/spin
// @desc    Spin the lucky wheel
// @access  Private
router.post('/spin', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Ensure balances object exists and initialize ubt if not present
        if (!user.balances) {
            user.balances = { ubt: 0, bitcoin: 0, ethereum: 0, usdt: 0 };
        } else if (typeof user.balances.ubt !== 'number') {
            user.balances.ubt = 0;
        }

        // 1. Check and Deduct Spin Cost
        if (user.balances.ubt < SPIN_COST) {
            return res.status(400).json({ success: false, message: 'Not enough UBT to spin.', currentBalance: user.balances.ubt });
        }
        user.balances.ubt -= SPIN_COST;

        // Record transaction for the cost of playing
        const costTransaction = new Transaction({
            userId,
            type: 'game_cost',
            amount: -SPIN_COST, // Negative amount for cost
            currency: 'UBT',
            description: 'Feeling Lucky - Spin Cost',
            status: 'completed',
        });
        await costTransaction.save();

        // 2. Determine Prize
        const prize = selectPrize();
        let prizeMessage = `You won ${prize.name}!`;
        if (prize.amount > 0) {
            prizeMessage += ` (+${prize.amount} UBT)`;
        }

        // 3. Add Prize Winnings (if any)
        if (prize.amount > 0) {
            user.balances.ubt += prize.amount;
            // Record transaction for winnings
            const prizeTransaction = new Transaction({
                userId,
                type: 'game_win',
                amount: prize.amount,
                currency: 'UBT',
                description: `Feeling Lucky - Won ${prize.name}`,
                status: 'completed',
            });
            await prizeTransaction.save();
        }
        
        await user.save();

        res.json({
            success: true,
            message: prizeMessage,
            prizeName: prize.name,
            prizeAmount: prize.amount,
            newBalance: user.balances.ubt
        });

    } catch (error) {
        console.error('Error during wheel spin:', error);
        res.status(500).json({ success: false, message: 'Server error during spin.', error: error.message });
    }
});
// Add this inside backend/routes/wheel.js, before the `export default router;` line.

import User from '../models/User.js'; // Ensure User model is imported

// @route   POST api/wheel/new-spin
// @desc    Process a spin from the new wheel game and update balance securely
// @access  Private
router.post('/new-spin', auth, async (req, res) => {
    const { betAmount, winnings } = req.body;

    // --- Server-side validation ---
    if (typeof betAmount !== 'number' || typeof winnings !== 'number' || betAmount <= 0) {
        return res.status(400).json({ msg: 'Invalid bet or winnings amount provided.' });
    }

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Verify user has enough UBT for the bet
        if (user.balances.ubt < betAmount) {
            return res.status(400).json({ msg: 'Insufficient balance. Transaction rejected.' });
        }

        // Calculate the net change in balance
        const netChange = winnings - betAmount;

        // Apply the change to the user's balance
        user.balances.ubt += netChange;

        // Save the updated user data to the database
        await user.save();

        // Send back a success response with the new authoritative balance
        res.json({
            success: true,
            msg: `Spin processed. Net change: ${netChange.toFixed(2)} UBT.`,
            balances: user.balances
        });

    } catch (err) {
        console.error('New wheel spin server error:', err.message);
        res.status(500).send('Server Error');
    }
});
export default router;
