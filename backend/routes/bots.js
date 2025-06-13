import express from 'express';
import auth from '../middleware/auth.js'; // Assuming this is your authentication middleware
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js'; // Import the Setting model

const router = express.Router();

// Updated bots array to match frontend
const bots = [
  { id: 1, name: "Starter UBT Bot", price: 100, lockInDays: 90, dailyCredit: 0.25, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Ideal for new investors to understand bot operations.", totalReturnAmount: 122.5, totalProfit: 22.5, profitRatio: 0.225 },
  { id: "GO-1", name: "GRAND OPENING: Starter UBT Bot", price: 125, lockInDays: 90, dailyCredit: 0.35, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Ideal for new investors to understand bot operations.", totalReturnAmount: 156.5, totalProfit: 31.5, profitRatio: 0.252, originalBotId: 1, isGrandOpeningOffer: true },
  { id: 2, name: "UBT Bot #2", price: 200, lockInDays: 180, dailyCredit: 0.5, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 290, totalProfit: 90, profitRatio: 0.45 },
  { id: "GO-2", name: "GRAND OPENING: UBT Bot #2", price: 250, lockInDays: 180, dailyCredit: 0.7, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 376, totalProfit: 126, profitRatio: 0.504, originalBotId: 2, isGrandOpeningOffer: true },
  { id: 3, name: "UBT Bot #3", price: 600, lockInDays: 365, dailyCredit: 1.5, hasBonus: true, bonusCreditAmount: 60, bonusCreditInterval: "quarterly (every 90 days)", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 1207.5, totalProfit: 607.5, profitRatio: 1.0125 },
  { id: "GO-3", name: "GRAND OPENING: UBT Bot #3", price: 750, lockInDays: 365, dailyCredit: 2.0, hasBonus: true, bonusCreditAmount: 80, bonusCreditInterval: "quarterly (every 90 days)", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 1530, totalProfit: 780, profitRatio: 1.04, originalBotId: 3, isGrandOpeningOffer: true },
  { id: 4, name: "UBT Bot #4", price: 1300, lockInDays: 365, dailyCredit: 3.2, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 1468, totalProfit: 168, profitRatio: 0.129 },
  { id: "GO-4", name: "GRAND OPENING: UBT Bot #4", price: 1625, lockInDays: 365, dailyCredit: 4.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 2090, totalProfit: 465, profitRatio: 0.286, originalBotId: 4, isGrandOpeningOffer: true },
  { id: 5, name: "UBT Bot #5", price: 3200, lockInDays: 365, dailyCredit: 8.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 4200, totalProfit: 1000, profitRatio: 0.3125 },
  { id: "GO-5", name: "GRAND OPENING: UBT Bot #5", price: 4000, lockInDays: 365, dailyCredit: 10.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 5630, totalProfit: 1630, profitRatio: 0.4075, originalBotId: 5, isGrandOpeningOffer: true },
  { id: 6, name: "UBT Bot #6", price: 7500, lockInDays: 365, dailyCredit: 18.0, hasBonus: true, bonusCreditAmount: 200, bonusCreditInterval: "quarterly (every 90 days)", specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 14070, totalProfit: 6570, profitRatio: 0.876 },
  { id: "GO-6", name: "GRAND OPENING: UBT Bot #6", price: 9375, lockInDays: 365, dailyCredit: 22.0, hasBonus: true, bonusCreditAmount: 250, bonusCreditInterval: "quarterly (every 90 days)", specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 18030, totalProfit: 8655, profitRatio: 0.923, originalBotId: 6, isGrandOpeningOffer: true },
  { id: 7, name: "UBT Bot #7", price: 17800, lockInDays: 365, dailyCredit: 40.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 32400, totalProfit: 14600, profitRatio: 0.820 },
  { id: "GO-7", name: "GRAND OPENING: UBT Bot #7", price: 22250, lockInDays: 365, dailyCredit: 50.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 43825, totalProfit: 21575, profitRatio: 0.970, originalBotId: 7, isGrandOpeningOffer: true },
  { id: 8, name: "UBT Bot #8", price: 42200, lockInDays: 365, dailyCredit: 95.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 76875, totalProfit: 34675, profitRatio: 0.822 },
  { id: "GO-8", name: "GRAND OPENING: UBT Bot #8", price: 52750, lockInDays: 365, dailyCredit: 120.0, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 101550, totalProfit: 48800, profitRatio: 0.925, originalBotId: 8, isGrandOpeningOffer: true },
  { id: 9, name: "UBT Bot #9", price: 100000, lockInDays: 365, dailyCredit: 220.0, hasBonus: true, bonusCreditAmount: 1000, bonusCreditInterval: "quarterly (every 90 days)", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 181300, totalProfit: 81300, profitRatio: 0.813 },
  { id: 10, name: "VIP Elite UBT Bot", price: 100000, lockInDays: 365, dailyCredit: 250.0, hasBonus: true, bonusCreditAmount: 1200, bonusCreditInterval: "quarterly (every 90 days)", specialFeature: "Dedicated VIP investment consultant for priority support and optimal returns.", totalReturnAmount: 211250, totalProfit: 111250, profitRatio: 1.1125 },
  { id: "GO-9", name: "GRAND OPENING: UBT Bot #9", price: 125000, lockInDays: 365, dailyCredit: 275.0, hasBonus: true, bonusCreditAmount: 1300, bonusCreditInterval: "quarterly (every 90 days)", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 246300, totalProfit: 121300, profitRatio: 0.970, originalBotId: 9, isGrandOpeningOffer: true },
  { id: "GO-10", name: "GRAND OPENING: VIP Elite UBT Bot", price: 125000, lockInDays: 365, dailyCredit: 300.0, hasBonus: true, bonusCreditAmount: 1500, bonusCreditInterval: "quarterly (every 90 days)", specialFeature: "Dedicated VIP investment consultant for priority support and optimal returns.", totalReturnAmount: 260250, totalProfit: 135250, profitRatio: 1.082, originalBotId: 10, isGrandOpeningOffer: true }
];

// Helper function to get bot by ID
function getBotById(id) {
    return bots.find(bot => String(bot.id) === String(id));
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

        if (user.balances.ubt < bot.price) {
            return res.status(400).json({ success: false, msg: 'Insufficient UBT balance' });
        }
    
        user.balances.ubt -= bot.price;
    
        // Add bot to user's bots array (new structure)
        if (!user.bots) user.bots = [];
        const alreadyOwned = user.bots.some(b => String(b.botId) === String(botId));
        if (!alreadyOwned) {
            user.bots.push({
                botId: String(bot.id),
                name: bot.name,
                investmentAmount: bot.price,
                purchasedAt: new Date(),
                status: 'active'
            });
        }
        // Also update botsPurchased for backward compatibility
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
            userId: req.user.id,
            txHash: `bot_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromAddress: user.walletAddresses?.ubt || 'system',
            amount: -bot.price, // Cost is negative
            ubtAmount: bot.price, // Amount of UBT spent
            currency: 'UBT',
            status: 'completed',
            type: 'wager', // Use a valid enum value
            description: transactionDescription,
            // relatedAddress: `bot_${bot.id}` // Optional, if you want to keep a reference
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

// @route   GET api/bots/purchased
// @desc    Get all bots purchased by the authenticated user
// @access  Private
router.get('/purchased', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }
        if (!user.bots || user.bots.length === 0) {
            return res.json({ success: true, bots: [] });
        }
        // Join user.bots with master bots list for full details
        const purchasedBots = user.bots.map(userBot => {
            const bot = bots.find(b => String(b.id) === String(userBot.botId));
            if (!bot) return null;
            return {
                ...bot,
                purchaseDate: userBot.purchasedAt,
                investmentAmount: userBot.investmentAmount,
                status: userBot.status
            };
        }).filter(Boolean);
        res.json({ success: true, bots: purchasedBots });
    } catch (err) {
        console.error('Error fetching purchased bots:', err);
        res.status(500).json({ success: false, msg: 'Server error while fetching purchased bots.' });
    }
});

export default router;
