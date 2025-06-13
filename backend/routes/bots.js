import express from 'express';
import auth from '../middleware/auth.js'; // Assuming this is your authentication middleware
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js'; // Import the Setting model

const router = express.Router();

// Updated bots array to match frontend
const bots = [
  { id: 1, name: "Starter UBT Bot", price: 100, lockInDays: 2, dailyCredit: 10.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Ideal for new investors to understand bot operations.", totalReturnAmount: 120.0, totalProfit: 20.0, profitRatio: 0.2 },
  { id: "GO-1", name: "GRAND OPENING: Starter UBT Bot", price: 125, lockInDays: 2, dailyCredit: 15.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Ideal for new investors to understand bot operations.", totalReturnAmount: 155.0, totalProfit: 30.0, profitRatio: 0.24, originalBotId: 1, isGrandOpeningOffer: true },
  { id: 2, name: "UBT Bot #2", price: 200, lockInDays: 48, dailyCredit: 11.88, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 770.24, totalProfit: 570.24, profitRatio: 2.8512 },
  { id: "GO-2", name: "GRAND OPENING: UBT Bot #2", price: 250, lockInDays: 48, dailyCredit: 17.82, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 1105.36, totalProfit: 855.36, profitRatio: 3.4214, originalBotId: 2, isGrandOpeningOffer: true },
  { id: 3, name: "UBT Bot #3", price: 600, lockInDays: 93, dailyCredit: 13.75, hasBonus: true, bonusCreditAmount: 418.25, bonusCreditInterval: "monthly (15th of month)", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 2901.0, totalProfit: 2301.0, profitRatio: 3.835 },
  { id: "GO-3", name: "GRAND OPENING: UBT Bot #3", price: 750, lockInDays: 93, dailyCredit: 20.62, hasBonus: true, bonusCreditAmount: 836.5, bonusCreditInterval: "monthly (15th of month)", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 4627.16, totalProfit: 3877.16, profitRatio: 5.1695, originalBotId: 3, isGrandOpeningOffer: true },
  { id: 4, name: "UBT Bot #4", price: 1300, lockInDays: 139, dailyCredit: 15.62, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 3471.18, totalProfit: 2171.18, profitRatio: 1.6701 },
  { id: "GO-4", name: "GRAND OPENING: UBT Bot #4", price: 1625, lockInDays: 139, dailyCredit: 23.43, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 4881.77, totalProfit: 3256.77, profitRatio: 2.0042, originalBotId: 4, isGrandOpeningOffer: true },
  { id: 5, name: "UBT Bot #5", price: 3200, lockInDays: 184, dailyCredit: 17.5, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 6420.0, totalProfit: 3220.0, profitRatio: 1.0063 },
  { id: "GO-5", name: "GRAND OPENING: UBT Bot #5", price: 4000, lockInDays: 184, dailyCredit: 26.25, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 8830.0, totalProfit: 4830.0, profitRatio: 1.2075, originalBotId: 5, isGrandOpeningOffer: true },
  { id: 6, name: "UBT Bot #6", price: 7500, lockInDays: 229, dailyCredit: 19.38, hasBonus: true, bonusCreditAmount: 589.65, bonusCreditInterval: "monthly (15th of month)", specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 16480.82, totalProfit: 8980.82, profitRatio: 1.1974 },
  { id: "GO-6", name: "GRAND OPENING: UBT Bot #6", price: 9375, lockInDays: 229, dailyCredit: 29.07, hasBonus: true, bonusCreditAmount: 1179.3, bonusCreditInterval: "monthly (15th of month)", specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 24201.29, totalProfit: 14826.29, profitRatio: 1.5815, originalBotId: 6, isGrandOpeningOffer: true },
  { id: 7, name: "UBT Bot #7", price: 17800, lockInDays: 275, dailyCredit: 21.25, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 23643.75, totalProfit: 5843.75, profitRatio: 0.3283 },
  { id: "GO-7", name: "GRAND OPENING: UBT Bot #7", price: 22250, lockInDays: 275, dailyCredit: 31.88, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 31017.0, totalProfit: 8767.0, profitRatio: 0.394, originalBotId: 7, isGrandOpeningOffer: true },
  { id: 8, name: "UBT Bot #8", price: 42200, lockInDays: 320, dailyCredit: 23.12, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 49598.4, totalProfit: 7398.4, profitRatio: 0.1753 },
  { id: "GO-8", name: "GRAND OPENING: UBT Bot #8", price: 52750, lockInDays: 320, dailyCredit: 34.68, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 63847.6, totalProfit: 11097.6, profitRatio: 0.2104, originalBotId: 8, isGrandOpeningOffer: true },
  { id: 9, name: "UBT Bot #9", price: 100000, lockInDays: 365, dailyCredit: 25.0, hasBonus: true, bonusCreditAmount: 760.42, bonusCreditInterval: "monthly (15th of month)", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 118250.0, totalProfit: 18250.0, profitRatio: 0.1825 },
  { id: 10, name: "VIP Elite UBT Bot", price: 100000, lockInDays: 365, dailyCredit: 25.0, hasBonus: true, bonusCreditAmount: 760.42, bonusCreditInterval: "monthly (15th of month)", specialFeature: "Dedicated VIP investment consultant for priority support and optimal returns.", totalReturnAmount: 118250.0, totalProfit: 18250.0, profitRatio: 0.1825 },
  { id: "GO-9", name: "GRAND OPENING: UBT Bot #9", price: 125000, lockInDays: 365, dailyCredit: 37.5, hasBonus: true, bonusCreditAmount: 1520.84, bonusCreditInterval: "monthly (15th of month)", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 150687.5, totalProfit: 25687.5, profitRatio: 0.2055, originalBotId: 9, isGrandOpeningOffer: true },
  { id: "GO-10", name: "GRAND OPENING: VIP Elite UBT Bot", price: 125000, lockInDays: 365, dailyCredit: 37.5, hasBonus: true, bonusCreditAmount: 1520.84, bonusCreditInterval: "monthly (15th of month)", specialFeature: "Dedicated VIP investment consultant for priority support and optimal returns.", totalReturnAmount: 150687.5, totalProfit: 25687.5, profitRatio: 0.2055, originalBotId: 10, isGrandOpeningOffer: true }
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
