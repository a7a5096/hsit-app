import express from 'express';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Bot from '../models/Bot.js'; 

const router = express.Router();

const SPIN_COST = 10;
const PRIZES = [
    { name: "10x Win!", type: 'ubt', multiplier: 10, weight: 2 },
    { name: "2x Win!", type: 'ubt', multiplier: 2, weight: 20 },
    { name: "1x Win (Stake Back)", type: 'ubt', multiplier: 1, weight: 30 },
    { name: "Lose", type: 'ubt', multiplier: 0, weight: 46 },
    { 
        name: "Free AI Bot + 200 UBT!", 
        type: 'bot',
        botProductId: "aiBalancer05", // The ID of the bot product to award
        bonusUbt: 200, 
        weight: 1 
    } 
];

function selectPrize() {
    const totalWeight = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
    let random = Math.random() * totalWeight;
    for (const prize of PRIZES) {
        if (random < prize.weight) return prize;
        random -= prize.weight;
    }
    return PRIZES.find(p => p.multiplier === 0);
}

router.post('/spin', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        
        if (!user.balances) user.balances = {};
        if (typeof user.balances.ubt !== 'number') user.balances.ubt = 0;

        if (user.balances.ubt < SPIN_COST) {
            return res.status(400).json({ success: false, message: 'Not enough UBT to spin.' });
        }
        user.balances.ubt -= SPIN_COST;
        const costTransaction = new Transaction({
            userId, type: 'game_cost', amount: -SPIN_COST, currency: 'UBT',
            description: 'Feeling Lucky - Spin Cost', status: 'completed'
        });
        await costTransaction.save();

        const prize = selectPrize();
        let ubtWinnings = 0;
        let prizeMessage = "Better luck next time!";
        let botWon = null;

        if (prize.type === 'ubt') {
            ubtWinnings = SPIN_COST * prize.multiplier;
            if (ubtWinnings > 0) {
                user.balances.ubt += ubtWinnings;
                prizeMessage = `You won ${ubtWinnings} UBT!`;
            }
        } else if (prize.type === 'bot') {
            ubtWinnings = prize.bonusUbt || 0;
            user.balances.ubt += ubtWinnings;

            const botProduct = await Bot.findOne({ botId: prize.botProductId });
            if (botProduct) {
                const newBot = {
                    botId: botProduct.botId,
                    name: botProduct.name,
                    investmentAmount: 0, // Free
                    purchasedAt: new Date(),
                    status: 'active'
                };
                
                // --- ROBUSTNESS FIX ---
                // Ensure the user.bots array exists before trying to push to it
                if (Array.isArray(user.bots)) {
                    user.bots.push(newBot);
                } else {
                    // If it doesn't exist for some reason, create it
                    user.bots = [newBot];
                }
                botWon = newBot;
                prizeMessage = `JACKPOT! You won a free ${botProduct.name} and ${ubtWinnings} UBT!`;
            } else {
                console.error(`Could not find bot with ID ${prize.botProductId}. Awarding UBT value instead.`);
                const fallbackUbt = 3000;
                user.balances.ubt += fallbackUbt;
                ubtWinnings += fallbackUbt;
                prizeMessage = `Congratulations! You won ${ubtWinnings} UBT!`;
            }
        }

        if (ubtWinnings > 0) {
            const winTransaction = new Transaction({
                userId, type: 'game_win', amount: ubtWinnings, currency: 'UBT',
                description: `Feeling Lucky - ${prize.name}`, status: 'completed'
            });
            await winTransaction.save();
        }
        
        await user.save();

        res.json({
            success: true,
            message: prizeMessage,
            prize: prize,
            newBalance: user.balances.ubt,
            botWon: botWon
        });

    } catch (error) {
        console.error('Error during wheel spin:', error);
        res.status(500).json({ success: false, message: 'Server error during spin.' });
    }
});

export default router;
