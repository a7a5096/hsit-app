import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Setting from '../models/Setting.js';
import { bots, getBotById, getBotByName, getSpringBonusAmount } from '../config/botDefinitions.js';
import { processUserPayouts } from '../services/payoutService.js';

const router = express.Router();

// @route   GET api/bots
// @desc    Get all available bots with bonus information
// @access  Public
router.get('/', async (req, res) => {
    try {
        const bonusCountdownPercent = await Setting.getBonusCountdown();
        const remainingDays = await Setting.getGrandOpeningRemainingDays();

        const botsWithBonusInfo = bots.map(bot => ({
            ...bot,
            springBonusAmount: getSpringBonusAmount(bot),
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
// @desc    Get all bots purchased by the authenticated user with server-calculated earnings
// @access  Private
router.get('/purchased', auth, async (req, res) => {
    try {
        // Process any pending payouts first so balances and tracking fields are current
        await processUserPayouts(req.user.id);

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, msg: 'User not found' });
        }
        const hasNewBots = Array.isArray(user.bots) && user.bots.length > 0;
        const hasLegacyBots = Array.isArray(user.botsPurchased) && user.botsPurchased.length > 0;

        if (!hasNewBots && !hasLegacyBots) {
            return res.json({ success: true, bots: [] });
        }
        
        const now = new Date();

        const normalizedUserBots = [];
        if (hasNewBots) {
            normalizedUserBots.push(...user.bots);
        }
        if (hasLegacyBots) {
            const alreadyIncluded = new Set(
                normalizedUserBots
                    .map(b => b?.botId)
                    .filter(Boolean)
                    .map(id => String(id))
            );

            user.botsPurchased.forEach(legacyBotId => {
                const legacyId = String(legacyBotId);
                if (!alreadyIncluded.has(legacyId)) {
                    normalizedUserBots.push({
                        botId: legacyId,
                        purchasedAt: user.createdAt,
                        status: 'active',
                        payoutProcessed: false
                    });
                }
            });
        }
        
        const purchasedBots = normalizedUserBots.map(userBot => {
            const masterBot =
                getBotById(userBot.botId) ||
                getBotById(userBot.id) ||
                getBotByName(userBot.name);
            if (!masterBot) return null;
            
            const purchaseDate = userBot.purchasedAt ? new Date(userBot.purchasedAt) : new Date();
            const investment = typeof userBot.investmentAmount === 'number' ? userBot.investmentAmount : masterBot.price;
            const lockInDays = userBot.lockInDays || masterBot.lockInDays;
            const dailyCredit = masterBot.dailyCredit;
            const totalReturnAmount = masterBot.totalReturnAmount;
            const totalProfit = masterBot.totalProfit;
            
            const completionDate = userBot.completionDate 
                ? new Date(userBot.completionDate) 
                : new Date(purchaseDate.getTime() + lockInDays * 24 * 60 * 60 * 1000);
            
            const msActive = Math.max(0, now - purchaseDate);
            const daysActive = Math.min(Math.floor(msActive / (1000 * 60 * 60 * 24)), lockInDays);
            const remainingDays = Math.max(0, lockInDays - daysActive);
            
            let status;
            if (userBot.status === 'completed' || userBot.payoutProcessed) {
                status = 'completed';
            } else if (remainingDays <= 0) {
                status = 'completed';
            } else {
                status = 'active';
            }
            
            // Use actual processed daily credits (already credited to balance)
            const dailyCreditsProcessed = userBot.dailyCreditsProcessed || 0;
            const earned = dailyCreditsProcessed * dailyCredit;
            const expectedFutureEarnings = Math.max(0, totalProfit - earned);
            
            return {
                botId: masterBot.id,
                name: masterBot.name,
                purchaseDate: purchaseDate.toISOString(),
                investmentAmount: investment,
                lockInDays: lockInDays,
                dailyCredit: dailyCredit,
                totalReturnAmount: totalReturnAmount,
                totalProfit: totalProfit,
                completionDate: completionDate.toISOString(),
                daysActive: daysActive,
                remainingDays: remainingDays,
                status: status,
                earned: earned,
                expectedFutureEarnings: expectedFutureEarnings,
                payoutProcessed: userBot.payoutProcessed || false,
                purchaseBonusAwarded: userBot.purchaseBonusAwarded || 0,
                bonusCreditsProcessed: userBot.bonusCreditsProcessed || 0
            };
        }).filter(Boolean);
        
        let totalInvestment = 0;
        let totalEarned = 0;
        let totalExpectedFuture = 0;
        let activeBots = 0;
        let completedBots = 0;
        
        purchasedBots.forEach(bot => {
            totalInvestment += bot.investmentAmount;
            totalEarned += bot.earned;
            totalExpectedFuture += bot.expectedFutureEarnings;
            if (bot.status === 'active') activeBots++;
            else completedBots++;
        });
        
        res.json({ 
            success: true, 
            bots: purchasedBots,
            summary: {
                totalInvestment,
                totalEarned,
                totalExpectedFuture,
                totalExpectedProfit: totalEarned + totalExpectedFuture,
                activeBots,
                completedBots,
                currentROI: totalInvestment > 0 ? ((totalEarned / totalInvestment) * 100) : 0,
                expectedROI: totalInvestment > 0 ? (((totalEarned + totalExpectedFuture) / totalInvestment) * 100) : 0
            }
        });
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

        // Process any pending payouts so the user's balance is up to date
        await processUserPayouts(req.user.id);
    
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(404).json({ success: false, msg: 'User not found' });
        }
    
        if (typeof user.balances?.ubt !== 'number') {
            console.log('Initializing UBT balance for user:', req.user.id);
            user.balances.ubt = 0;
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
    
        if (!user.bots) user.bots = [];
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + bot.lockInDays);
        
        // Calculate the Spring Bonus (20% of price for bonus-eligible bots)
        const springBonus = getSpringBonusAmount(bot);
        let bonusAwarded = 0;

        if (springBonus > 0) {
            bonusAwarded = springBonus;
            user.balances.ubt += bonusAwarded;
            console.log(`Awarded ${bonusAwarded} UBT Spring Bonus for ${bot.name} to user ${user.username}`);
        }

        user.bots.push({
            botId: String(bot.id),
            name: bot.name,
            investmentAmount: bot.price,
            purchasedAt: new Date(),
            status: 'active',
            completionDate: completionDate,
            totalPayout: bot.totalReturnAmount,
            payoutProcessed: false,
            lockInDays: bot.lockInDays,
            dailyCreditsProcessed: 0,
            bonusCreditsProcessed: 0,
            purchaseBonusAwarded: bonusAwarded
        });

        if (!user.botsPurchased) {
            user.botsPurchased = [];
        }
        user.botsPurchased.push(botId.toString());
        
        const transactionDescription = `Purchased ${bot.name} bot` + (bonusAwarded > 0 ? ` (Spring Bonus: ${bonusAwarded} UBT)` : '');
        const transaction = new Transaction({
            userId: req.user.id,
            txHash: `bot_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fromAddress: user.walletAddresses?.ubt || 'system',
            amount: -bot.price,
            ubtAmount: bot.price,
            currency: 'UBT',
            status: 'completed',
            type: 'wager',
            description: transactionDescription,
        });
        await transaction.save();

        if (bonusAwarded > 0) {
            const bonusTransaction = new Transaction({
                userId: req.user.id,
                txHash: `spring_bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                fromAddress: 'system',
                amount: bonusAwarded,
                ubtAmount: bonusAwarded,
                currency: 'UBT',
                type: 'reward',
                status: 'completed',
                description: `Spring Bonus for purchasing ${bot.name}`
            });
            await bonusTransaction.save();
        }
        
        await user.save();

        // After successful purchase, decrease the global bonus countdown
        const currentBonusCountdown = await Setting.getBonusCountdown();
        let newBonusCountdown = currentBonusCountdown;
        try {
            newBonusCountdown = await Setting.decreaseBonusCountdown(5);
            console.log(`Global bonus countdown updated to: ${newBonusCountdown}%`);
        } catch (countdownError) {
            console.error("Error updating bonus countdown:", countdownError);
        }
        
        // Handle referral bonuses
        if (user.invitedBy) {
            try {
                const directReferrer = await User.findById(user.invitedBy);
                if (directReferrer) {
                    directReferrer.balances.ubt += 10;
                    directReferrer.qualifiedInvites += 1;
                    directReferrer.ubtBonusEarned += 10;
                    
                    if (directReferrer.qualifiedInvites === 10) {
                        const freeBot = getBotById(3);
                        if (freeBot) {
                            const freeBotCompletion = new Date();
                            freeBotCompletion.setDate(freeBotCompletion.getDate() + freeBot.lockInDays);
                            
                            directReferrer.bots.push({
                                botId: String(freeBot.id),
                                name: freeBot.name,
                                investmentAmount: 0,
                                purchasedAt: new Date(),
                                status: 'active',
                                completionDate: freeBotCompletion,
                                totalPayout: freeBot.totalReturnAmount,
                                payoutProcessed: false,
                                lockInDays: freeBot.lockInDays,
                                dailyCreditsProcessed: 0,
                                bonusCreditsProcessed: 0,
                                purchaseBonusAwarded: 0
                            });
                            
                            const freeBotTransaction = new Transaction({
                                userId: directReferrer._id,
                                txHash: `free_bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                fromAddress: 'system',
                                amount: 0,
                                ubtAmount: 0,
                                currency: 'UBT',
                                type: 'reward',
                                status: 'completed',
                                description: `Free ${freeBot.name} (Bot #3) for 10 qualified referrals`
                            });
                            await freeBotTransaction.save();
                            console.log(`Awarded free bot to ${directReferrer.username} for 10 qualified invites`);
                        }
                    }
                    
                    await directReferrer.save();
                    
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
                    
                    if (directReferrer.invitedBy) {
                        const secondLevelReferrer = await User.findById(directReferrer.invitedBy);
                        if (secondLevelReferrer) {
                            secondLevelReferrer.balances.ubt += 15;
                            secondLevelReferrer.ubtBonusEarned += 15;
                            await secondLevelReferrer.save();
                            
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
            }
        }
    
        res.json({
            success: true,
            msg: 'Bot purchased successfully' + (bonusAwarded > 0 ? ` You received a Spring Bonus of ${bonusAwarded} UBT!` : ''),
            botId: bot.id,
            newBalance: user.balances.ubt,
            globalBonusCountdownPercent: newBonusCountdown
        });
    } catch (err) {
        console.error("Error during bot purchase:",err.message);
        res.status(500).json({ success: false, message: 'Server error during purchase.' });
    }
});

export default router;
