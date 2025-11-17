import express from 'express';
import auth from '../middleware/auth.js'; // Assuming this is your authentication middleware
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js'; // Import the Setting model

const router = express.Router();

// Updated bots array to match frontend
const bots = [
  { id: 1, name: "Starter UBT Bot", price: 100, lockInDays: 2, dailyCredit: 1, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Ideal for new investors to understand bot operations.", totalReturnAmount: 102, totalProfit: 2, profitRatio: 0.02 },
  { id: 2, name: "UBT Bot #2", price: 200, lockInDays: 4, dailyCredit: 3, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 212, totalProfit: 12, profitRatio: 0.06 },
  { id: 3, name: "UBT Bot #3", price: 600, lockInDays: 8, dailyCredit: 6, hasBonus: true, bonusCreditAmount: 20, bonusCreditInterval: "every 120 days", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 648, totalProfit: 48, profitRatio: 0.08 },
  { id: 4, name: "UBT Bot #4", price: 1300, lockInDays: 16, dailyCredit: 10, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 1460, totalProfit: 160, profitRatio: 0.123 },
  { id: 5, name: "UBT Bot #5", price: 3200, lockInDays: 32, dailyCredit: 15, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 3680, totalProfit: 480, profitRatio: 0.15 },
  { id: 6, name: "UBT Bot #6", price: 7500, lockInDays: 64, dailyCredit: 21, hasBonus: true, bonusCreditAmount: 60, bonusCreditInterval: "every 120 days", specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 8844, totalProfit: 1344, profitRatio: 0.179 },
  { id: 7, name: "UBT Bot #7", price: 17800, lockInDays: 128, dailyCredit: 28, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 21384, totalProfit: 3584, profitRatio: 0.201 },
  { id: 8, name: "UBT Bot #8", price: 42200, lockInDays: 256, dailyCredit: 36, hasBonus: false, bonusCreditAmount: 0.0, bonusCreditInterval: null, specialFeature: "Accelerated profit generation and daily insights.", totalReturnAmount: 51424, totalProfit: 9224, profitRatio: 0.219 },
  { id: 9, name: "UBT Bot #9", price: 100000, lockInDays: 512, dailyCredit: 45, hasBonus: true, bonusCreditAmount: 200, bonusCreditInterval: "every 120 days", specialFeature: "Enhanced returns for dedicated investors.", totalReturnAmount: 123040, totalProfit: 23040, profitRatio: 0.23 },
  { id: 10, name: "VIP Elite UBT Bot", price: 100000, lockInDays: 1024, dailyCredit: 55, hasBonus: true, bonusCreditAmount: 400, bonusCreditInterval: "every 90 days", specialFeature: "Dedicated VIP investment consultant for priority support and optimal returns.", totalReturnAmount: 156320, totalProfit: 56320, profitRatio: 0.563 }
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
        const remainingDays = await Setting.getGrandOpeningRemainingDays();

        const botsWithBonusInfo = bots.map(bot => ({
            ...bot,
            // A bot has an active bonus if it's eligible AND the countdown is > 0
            hasActiveBonus: bot.hasBonus && bonusCountdownPercent > 0
        }));

        res.json({
            success: true,
            bots: botsWithBonusInfo,
            globalBonusCountdownPercent: bonusCountdownPercent,
            grandOpeningRemainingDays: remainingDays
        });
    } catch (err) {
        console.error("Error fetching bots or bonus countdown:", err.message);
        res.status(500).json({ success: false, message: 'Server error while fetching bot data.' });
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

// @route   GET api/bots/:id
// @desc    Get bot by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const bot = getBotById(req.params.id);
        if (!bot) {
            return res.status(404).json({ success: false, msg: 'Bot not found' });
        }
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
    console.log('Purchase request received:', { botId, body: req.body });
  
    try {
        const bot = getBotById(botId);
        if (!bot) {
            console.log('Bot not found:', botId);
            return res.status(404).json({ success: false, msg: 'Bot not found' });
        }
    
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({ success: false, msg: 'User not found' });
        }
    
        // Ensure user.balances.ubt exists and is a number
        if (typeof user.balances?.ubt !== 'number') {
            console.log('Initializing UBT balance for user:', req.user.id);
            user.balances.ubt = 0; // Initialize if undefined or not a number
        }

        console.log('User balance check:', { 
            userBalance: user.balances.ubt, 
            botPrice: bot.price,
            hasEnoughBalance: user.balances.ubt >= bot.price
        });

        if (user.balances.ubt < bot.price) {
            return res.status(400).json({ success: false, msg: 'Insufficient UBT balance' });
        }
    
        user.balances.ubt -= bot.price;
    
        // Add bot to user's bots array (new structure)
        if (!user.bots) user.bots = [];
        const alreadyOwned = user.bots.some(b => String(b.botId) === String(botId));
        if (!alreadyOwned) {
            const completionDate = new Date();
            completionDate.setDate(completionDate.getDate() + bot.lockInDays);
            
            user.bots.push({
                botId: String(bot.id),
                name: bot.name,
                investmentAmount: bot.price,
                purchasedAt: new Date(),
                status: 'active',
                completionDate: completionDate,
                totalPayout: bot.totalReturnAmount,
                payoutProcessed: false,
                lockInDays: bot.lockInDays
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
        if (bot.hasBonus && currentBonusCountdown > 0) {
            bonusAwarded = bot.bonusCreditAmount || 0;
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
                txHash: `bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                fromAddress: user.walletAddresses?.ubt || 'system',
                amount: bonusAwarded,
                ubtAmount: bonusAwarded,
                currency: 'UBT',
                type: 'wager', // Changed from 'bonus_award' to 'wager'
                status: 'completed',
                description: `Bonus for purchasing ${bot.name}`,
                relatedAsset: `bot_${bot.id}`
            });
            await bonusTransaction.save();
        }
        
        await user.save();
        
        // Handle referral bonuses
        if (user.invitedBy) {
            try {
                // Give 10 UBT to direct referrer
                const directReferrer = await User.findById(user.invitedBy);
                if (directReferrer) {
                    directReferrer.balances.ubt += 10;
                    directReferrer.qualifiedInvites += 1;
                    directReferrer.ubtBonusEarned += 10;
                    
                    // Check if they qualify for free bot (10 qualified invites)
                    if (directReferrer.qualifiedInvites === 10) {
                        // Give them a free Bot #5 (3200 UBT value)
                        const freeBot = getBotById(5);
                        if (freeBot) {
                            const completionDate = new Date();
                            completionDate.setDate(completionDate.getDate() + freeBot.lockInDays);
                            
                            directReferrer.bots.push({
                                botId: String(freeBot.id),
                                name: freeBot.name,
                                investmentAmount: 0, // Free bot
                                purchasedAt: new Date(),
                                status: 'active',
                                completionDate: completionDate,
                                totalPayout: freeBot.totalReturnAmount,
                                payoutProcessed: false,
                                lockInDays: freeBot.lockInDays
                            });
                            
                            // Create transaction for free bot
                            const freeBotTransaction = new Transaction({
                                userId: directReferrer._id,
                                txHash: `free_bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                fromAddress: 'system',
                                amount: 0,
                                ubtAmount: 0,
                                currency: 'UBT',
                                type: 'reward',
                                status: 'completed',
                                description: `Free ${freeBot.name} for 10 qualified referrals`
                            });
                            await freeBotTransaction.save();
                            console.log(`Awarded free bot to ${directReferrer.username} for 10 qualified invites`);
                        }
                    }
                    
                    await directReferrer.save();
                    
                    // Create referral bonus transaction
                    const referralTransaction = new Transaction({
                        userId: directReferrer._id,
                        txHash: `referral_bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        fromAddress: 'system',
                        amount: 10,
                        ubtAmount: 10,
                        currency: 'UBT',
                        type: 'reward',
                        status: 'completed',
                        description: `Referral bonus for ${user.username}'s bot purchase`
                    });
                    await referralTransaction.save();
                    console.log(`Awarded 10 UBT referral bonus to ${directReferrer.username}`);
                    
                    // Give 15 UBT to second-level referrer if exists
                    if (directReferrer.invitedBy) {
                        const secondLevelReferrer = await User.findById(directReferrer.invitedBy);
                        if (secondLevelReferrer) {
                            secondLevelReferrer.balances.ubt += 15;
                            secondLevelReferrer.ubtBonusEarned += 15;
                            await secondLevelReferrer.save();
                            
                            // Create second-level referral bonus transaction
                            const secondLevelTransaction = new Transaction({
                                userId: secondLevelReferrer._id,
                                txHash: `referral_bonus_l2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                fromAddress: 'system',
                                amount: 15,
                                ubtAmount: 15,
                                currency: 'UBT',
                                type: 'reward',
                                status: 'completed',
                                description: `2nd level referral bonus for ${user.username}'s bot purchase`
                            });
                            await secondLevelTransaction.save();
                            console.log(`Awarded 15 UBT second-level referral bonus to ${secondLevelReferrer.username}`);
                        }
                    }
                }
            } catch (referralError) {
                console.error('Error processing referral bonuses:', referralError);
                // Don't fail the purchase if referral bonus fails
            }
        }
        
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
