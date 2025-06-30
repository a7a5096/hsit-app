import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

/**
 * Service to handle automatic bot completion and payouts
 */
class BotCompletionService {
    
    /**
     * Process all bots that have reached their completion date
     */
    static async processCompletedBots() {
        try {
            console.log('Starting bot completion processing...');
            const now = new Date();
            
            // Find all users with active bots that should be completed
            const users = await User.find({
                'bots.status': 'active',
                'bots.completionDate': { $lte: now },
                'bots.payoutProcessed': false
            });
            
            let processedCount = 0;
            
            for (const user of users) {
                for (const bot of user.bots) {
                    if (bot.status === 'active' && 
                        bot.completionDate && 
                        bot.completionDate <= now && 
                        !bot.payoutProcessed) {
                        
                        await this.processBotCompletion(user, bot);
                        processedCount++;
                    }
                }
            }
            
            console.log(`Processed ${processedCount} completed bots`);
            return processedCount;
            
        } catch (error) {
            console.error('Error processing completed bots:', error);
            throw error;
        }
    }
    
    /**
     * Process completion for a specific bot
     */
    static async processBotCompletion(user, bot) {
        try {
            console.log(`Processing completion for bot ${bot.name} for user ${user.username}`);
            
            // Add total payout to user's UBT balance
            const currentUbtBalance = user.balances.ubt || 0;
            const newUbtBalance = currentUbtBalance + bot.totalPayout;
            
            user.balances.ubt = newUbtBalance;
            
            // Update bot status
            bot.status = 'completed';
            bot.payoutProcessed = true;
            
            // Create transaction record for the payout
            const transaction = new Transaction({
                userId: user._id,
                txHash: `bot_completion_${bot.botId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                fromAddress: 'system',
                amount: bot.totalPayout,
                ubtAmount: bot.totalPayout,
                currency: 'UBT',
                type: 'reward',
                status: 'completed',
                description: `Bot completion payout for ${bot.name}`,
                relatedAsset: `bot_${bot.botId}`
            });
            
            await transaction.save();
            await user.save();
            
            console.log(`Completed payout of ${bot.totalPayout} UBT for bot ${bot.name} to user ${user.username}`);
            
        } catch (error) {
            console.error(`Error processing bot completion for user ${user.username}:`, error);
            throw error;
        }
    }
    
    /**
     * Process retroactive payouts for bots that were completed before this system was implemented
     */
    static async processRetroactivePayouts() {
        try {
            console.log('Starting retroactive payout processing...');
            
            // Bot definitions for calculating payouts
            const botPayouts = {
                '1': 102,   // Starter UBT Bot
                '2': 212,   // UBT Bot #2
                '3': 648,   // UBT Bot #3
                '4': 1460,  // UBT Bot #4
                '5': 3680,  // UBT Bot #5
                '6': 8844,  // UBT Bot #6
                '7': 21384, // UBT Bot #7
                '8': 51424, // UBT Bot #8
                '9': 123040, // UBT Bot #9
                '10': 156320 // VIP Elite UBT Bot
            };
            
            // Find all users with bots that need retroactive processing
            const users = await User.find({
                'bots': { $exists: true, $ne: [] }
            });
            
            let processedCount = 0;
            
            for (const user of users) {
                for (const bot of user.bots) {
                    // Check if bot should have been completed but hasn't been processed
                    const shouldBeCompleted = this.shouldBotBeCompleted(bot);
                    
                    if (shouldBeCompleted && !bot.payoutProcessed) {
                        // Calculate payout amount if not already set
                        if (!bot.totalPayout) {
                            bot.totalPayout = botPayouts[bot.botId] || 0;
                        }
                        
                        // Calculate completion date if not set
                        if (!bot.completionDate && bot.purchasedAt && bot.lockInDays) {
                            bot.completionDate = new Date(bot.purchasedAt);
                            bot.completionDate.setDate(bot.completionDate.getDate() + bot.lockInDays);
                        }
                        
                        if (bot.totalPayout > 0) {
                            await this.processBotCompletion(user, bot);
                            processedCount++;
                        }
                    }
                }
            }
            
            console.log(`Processed ${processedCount} retroactive bot payouts`);
            return processedCount;
            
        } catch (error) {
            console.error('Error processing retroactive payouts:', error);
            throw error;
        }
    }
    
    /**
     * Determine if a bot should be completed based on its purchase date and lock period
     */
    static shouldBotBeCompleted(bot) {
        if (!bot.purchasedAt) return false;
        
        // If lockInDays is not set, try to determine from botId
        let lockInDays = bot.lockInDays;
        if (!lockInDays) {
            const lockInDaysMap = {
                '1': 2, '2': 4, '3': 8, '4': 16, '5': 32,
                '6': 64, '7': 128, '8': 256, '9': 512, '10': 1024
            };
            lockInDays = lockInDaysMap[bot.botId] || 0;
        }
        
        if (lockInDays === 0) return false;
        
        const completionDate = new Date(bot.purchasedAt);
        completionDate.setDate(completionDate.getDate() + lockInDays);
        
        return new Date() >= completionDate;
    }
}

export default BotCompletionService;

