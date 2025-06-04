import express from 'express';
import auth from '../middleware/auth.js'; // Assuming this is your authentication middleware
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js'; // Import the Setting model

const router = express.Router();

// Bot definitions - Added 'offersBonus' and 'bonusPayment'
// You'll need to decide which bots offer bonuses and their respective amounts.
const bots = [
    { id: 1, name: "Starter Bot", cost: 100, description: "Entry-level trading bot", offersBonus: true, bonusPayment: 10 },
    { id: 2, name: "Standard Bot", cost: 300, description: "Standard trading bot with more features", offersBonus: true, bonusPayment: 30 },
    { id: 3, name: "Premium Bot", cost: 500, description: "Premium trading bot with advanced features", offersBonus: true, bonusPayment: 50 },
    { id: 4, name: "Pro Bot", cost: 1000, description: "Professional trading bot with all features", offersBonus: false, bonusPayment: 0 }, // Example: No bonus
    { id: 5, name: "Elite Bot", cost: 5000, description: "Elite VIP trading bot with personalized service", offersBonus: true, bonusPayment: 250 }
];

// Helper function to get bot by ID
function getBotById(id) {
    return bots.find(bot => bot.id === parseInt(id));
}

// @route   GET api/bots
// @desc    Get all available bots with bonus information
// @access  Public
router.get('/', async (req, res) => {
    try {
        const bonusCountdownPercent = await Setting.getBonusCountdown();

        const botsWithBonusInfo = bots.map(bot => ({
            ...bot,
            // A bot has an active bonus if it's eligible AND the countdown is > 0
            hasActiveBonus: bot.offersBonus && bonusCountdownPercent > 0
        }));

        res.json({
            success: true,
            bots: botsWithBonusInfo,
            globalBonusCountdownPercent: bonusCountdownPercent
        });
    } catch (err) {
        console.error("Error fetching bots or bonus countdown:", err.message);
        res.status(500).json({ success: false, message: 'Server error while fetching bot data.' });
    }
});

// @route   GET api/bots/:id
// @desc    Get bot by ID (no changes needed here for the countdown bar, but could add bonus info if desired)
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const bot = getBotById(req.params.id);
        if (!bot) {
            return res.status(404).json({ success: false, msg: 'Bot not found' });
        }
        // You could also add bonusCountdownPercent and hasActiveBonus here if needed for a single bot view
        res.json({ success: true, bot });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST api/bots/purchase
// @desc    Purchase a bot
// @access  Private
router.post('/purchase', auth, async (req, res) => {
    const { botId } = req.body;
  
    try {
        const bot = getBotById(botId);
        if (!bot) {
            return res.status(404).json({ success: false, msg: 'Bot not found' });
        }
    
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }
    
        // Ensure user.balances.ubt exists and is a number
        if (typeof user.balances?.ubt !== 'number') {
             user.balances.ubt = 0; // Initialize if undefined or not a number
        }

        if (user.balances.ubt < bot.cost) {
            return res.status(400).json({ success: false, msg: 'Insufficient UBT balance' });
        }
    
        user.balances.ubt -= bot.cost;
    
        // Add bot to user's purchased bots (ensure array exists)
        if (!user.botsPurchased) {
            user.botsPurchased = [];
        }
        if (!user.botsPurchased.includes(botId.toString())) {
            user.botsPurchased.push(botId.toString());
        }
        
        // Handle bonus payment if applicable
        const currentBonusCountdown = await Setting.getBonusCountdown();
        let bonusAwarded = 0;
        if (bot.offersBonus && currentBonusCountdown > 0) {
            bonusAwarded = bot.bonusPayment || 0;
            user.balances.ubt += bonusAwarded; // Add bonus to UBT balance
            console.log(`Awarded ${bonusAwarded} UBT bonus for ${bot.name} to user ${user.username}`);
        }

        const transactionDescription = `Purchased ${bot.name} bot` + (bonusAwarded > 0 ? ` (Bonus: ${bonusAwarded} UBT)` : '');
        const transaction = new Transaction({
            userId: req.user.id, // Corrected: use userId field name if your model uses it
            type: 'bot_purchase', // More specific type
            currency: 'UBT',
            amount: -bot.cost, // Cost is negative
            status: 'completed',
            description: transactionDescription,
            relatedAsset: `bot_${bot.id}` // Example of linking to asset
        });
        await transaction.save();

        // If a bonus was awarded, create a separate transaction for clarity
        if (bonusAwarded > 0) {
            const bonusTransaction = new Transaction({
                userId: req.user.id,
                type: 'bonus_award',
                currency: 'UBT',
                amount: bonusAwarded, // Bonus is positive
                status: 'completed',
                description: `Bonus for purchasing ${bot.name}`,
                relatedAsset: `bot_${bot.id}`
            });
            await bonusTransaction.save();
        }
        
        await user.save();
        
        // After successful purchase and saving user/transaction, decrease the global bonus countdown
        let newBonusCountdown = currentBonusCountdown; // Keep current if no decrease happens
        try {
            newBonusCountdown = await Setting.decreaseBonusCountdown(5); // Decrease by 5%
            console.log(`Global bonus countdown updated to: ${newBonusCountdown}%`);
        } catch (countdownError) {
            console.error("Error updating bonus countdown:", countdownError);
            // Continue without failing the purchase
        }
    
        res.json({
            success: true,
            msg: 'Bot purchased successfully' + (bonusAwarded > 0 ? ` You received a bonus of ${bonusAwarded} UBT!` : ''),
            botId: bot.id, // Use bot.id for consistency
            // transactionId: transaction._id, // Return transaction ID
            newBalance: user.balances.ubt,
            globalBonusCountdownPercent: newBonusCountdown // Send updated countdown
        });
    } catch (err) {
        console.error("Error during bot purchase:",err.message);
        res.status(500).json({ success: false, message: 'Server error during purchase.' });
    }
});

export default router;
