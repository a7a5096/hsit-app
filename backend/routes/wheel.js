import express from 'express';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js'; // Assuming path to your User model
import Transaction from '../models/Transaction.js'; // Assuming path to Transaction model

const router = express.Router();

const SPIN_COST = 10; // UBT cost per spin, must match frontend

// Updated prize list with "Spin Again"
const PRIZES = [
    { name: "Jackpot!", amount: 100, weight: 1 },         // 100 UBT
    { name: "Big Win!", amount: 50, weight: 4 },           // 50 UBT
    { name: "Small Win", amount: 20, weight: 15 },         // 20 UBT (COST_PER_SPIN * 2)
    { name: "Free Spin", amount: 10, weight: 20 },         // Wins cost back
    { name: "Spin Again", amount: 10, weight: 10, isSpinAgain: true }, // New prize, refunds spin cost
    { name: "Try Again", amount: 0, weight: 50 }          // No win (weight adjusted)
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

        if (!user.balances) {
            user.balances = { ubt: 0 };
        } else if (typeof user.balances.ubt !== 'number') {
            user.balances.ubt = 0;
        }

        // 1. Check and Deduct Spin Cost
        if (user.balances.ubt < SPIN_COST) {
            return res.status(400).json({ success: false, message: 'Not enough UBT to spin.', currentBalance: user.balances.ubt });
        }
        user.balances.ubt -= SPIN_COST;

        const costTransaction = new Transaction({
            userId,
            type: 'game_cost',
            amount: -SPIN_COST,
            currency: 'UBT',
            description: 'Feeling Lucky - Spin Cost',
            status: 'completed',
        });
        await costTransaction.save();

        // 2. Determine Prize
        const prize = selectPrize();
        let prizeMessage = `You won ${prize.name}!`;
        if(prize.isSpinAgain) {
            prizeMessage = "You landed on Spin Again!";
        } else if (prize.amount > 0) {
            prizeMessage = `You won ${prize.amount} UBT!`;
        } else {
            prizeMessage = "Sorry, try again!";
        }

        // 3. Add Prize Winnings
        if (prize.amount > 0) {
            user.balances.ubt += prize.amount;
            const prizeTransaction = new Transaction({
                userId,
                type: 'game_win',
                amount: prize.amount,
                currency: 'UBT',
                description: `Feeling Lucky - ${prize.name}`,
                status: 'completed',
            });
            await prizeTransaction.save();
        }
        
        await user.save();

        // 4. Send Response
        res.json({
            success: true,
            message: prizeMessage,
            prizeName: prize.name,
            prizeAmount: prize.amount,
            newBalance: user.balances.ubt,
            isSpinAgain: prize.isSpinAgain || false // Send the flag to the frontend
        });

    } catch (error) {
        console.error('Error during wheel spin:', error);
        res.status(500).json({ success: false, message: 'Server error during spin.', error: error.message });
    }
});

export default router;
