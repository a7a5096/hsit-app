import express from 'express';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Bot from '../models/Bot.js'; // You need a Bot model to look up the prize bot

const router = express.Router();

const SPIN_COST = 10; // UBT cost per spin

// Define the prize structure for the wheel
const PRIZES = [
    // Note: The 'color' is for mapping the prize to the frontend visual
    { name: "10x Win!", type: 'ubt', multiplier: 10, weight: 2, color: 'red' },    // Doubled chance for red
    { name: "2x Win!", type: 'ubt', multiplier: 2, weight: 20, color: 'yellow' },
    { name: "1x Win (Stake Back)", type: 'ubt', multiplier: 1, weight: 30, color: 'blue' },
    { name: "Lose", type: 'ubt', multiplier: 0, weight: 46, color: 'black' },   // Reduced chance for black
    { 
        name: "Free AI Bot + 200 UBT!", 
        type: 'bot',
        botName: "AI Portfolio Balancer", // Name of the bot to award
        botProductId: "aiBalancer05", // The ID of the bot product
        bonusUbt: 200, 
        weight: 1 // ~1 in 99 chance (1 / (2+20+30+46+1))
    } 
];

// Helper to select a prize based on weight
function selectPrize() {
    const totalWeight = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
    let random = Math.random() * totalWeight;
    for (const prize of PRIZES) {
        if (random < prize.weight) return prize;
        random -= prize.weight;
    }
    return PRIZES.find(p => p.multiplier === 0); // Fallback to "Lose"
}

// @route   POST api/wheel/spin
// @desc    Spin the lucky wheel, deduct cost, and credit winnings
// @access  Private
router.post('/spin', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        // Ensure balances object and ubt field exist
        if (!user.balances) user.balances = {};
        if (typeof user.balances.ubt !== 'number') user.balances.ubt = 0;

        // 1. Check and Deduct Spin Cost
        if (user.balances.ubt < SPIN_COST) {
            return res.status(400).json({ success: false, message: 'Not enough UBT to spin.' });
        }
        user.balances.ubt -= SPIN_COST;
        const costTransaction = new Transaction({
            userId, type: 'game_cost', amount: -SPIN_COST, currency: 'UBT',
            description: 'Feeling Lucky - Spin Cost', status: 'completed'
        });
        await costTransaction.save();

        // 2. Determine the prize
        const prize = selectPrize();

        let ubtWinnings = 0;
        let prizeMessage = "Better luck next time!";
        let botWon = null;

        // 3. Process the prize
        if (prize.type === 'ubt') {
            ubtWinnings = SPIN_COST * prize.multiplier;
            if (ubtWinnings > 0) {
                user.balances.ubt += ubtWinnings;
                prizeMessage = `You won ${ubtWinnings} UBT!`;
            }
        } else if (prize.type === 'bot') {
            ubtWinnings = prize.bonusUbt || 0; // The bonus 200 UBT
            user.balances.ubt += ubtWinnings;

            // Find the bot product to award from the 'bots' collection
            const botProduct = await Bot.findOne({ botId: prize.botProductId }); // Assuming Bot model and botId field
            if (botProduct) {
                // Add the bot to the user's owned bots array
                const newBot = {
                    botId: botProduct.botId,
                    name: botProduct.name,
                    investmentAmount: 0, // It was free
                    purchasedAt: new Date(),
                    status: 'active'
                };
                user.bots.push(newBot);
                botWon = newBot;
                prizeMessage = `JACKPOT! You won a free ${botProduct.name} and ${ubtWinnings} UBT!`;
            } else {
                // Fallback if bot isn't found: award its UBT value instead
                console.error(`Could not find bot with ID ${prize.botProductId} to award. Awarding UBT value instead.`);
                const fallbackUbt = 3000; // Value of the bot
                user.balances.ubt += fallbackUbt;
                ubtWinnings += fallbackUbt; // Total UBT won is bonus + fallback value
                prizeMessage = `Congratulations! You won ${ubtWinnings} UBT!`;
            }
        }

        // Create transaction record for any winnings
        if (ubtWinnings > 0) {
            const winTransaction = new Transaction({
                userId, type: 'game_win', amount: ubtWinnings, currency: 'UBT',
                description: `Feeling Lucky - ${prize.name}`, status: 'completed'
            });
            await winTransaction.save();
        }

        // Save all changes to the user document
        await user.save();

        res.json({
            success: true,
            message: prizeMessage,
            prize: prize, // Send prize details for frontend to animate wheel
            newBalance: user.balances.ubt,
            botWon: botWon // Send details of the won bot if any
        });

    } catch (error) {
        console.error('Error during wheel spin:', error);
        res.status(500).json({ success: false, message: 'Server error during spin.' });
    }
});

export default router;
