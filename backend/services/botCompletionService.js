import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { processUserPayouts } from './payoutService.js';

/**
 * Legacy service kept for backward compatibility.
 * All payout logic now delegates to payoutService.processUserPayouts().
 */
class BotCompletionService {

    static async processCompletedBots() {
        try {
            console.log('Starting bot completion processing (via payoutService)...');
            const now = new Date();

            const users = await User.find({
                'bots.status': 'active',
                'bots.payoutProcessed': false
            });

            let processedCount = 0;

            for (const user of users) {
                const hadPending = user.bots.some(
                    b => b.status === 'active' && !b.payoutProcessed
                );
                if (hadPending) {
                    await processUserPayouts(user._id);
                    processedCount++;
                }
            }

            console.log(`Processed payouts for ${processedCount} user(s)`);
            return processedCount;
        } catch (error) {
            console.error('Error processing completed bots:', error);
            throw error;
        }
    }

    /**
     * @deprecated Use processUserPayouts directly
     */
    static async processBotCompletion(user, bot) {
        await processUserPayouts(user._id);
    }

    static async processRetroactivePayouts() {
        try {
            console.log('Starting retroactive payout processing (via payoutService)...');

            const users = await User.find({
                'bots': { $exists: true, $ne: [] }
            });

            let processedCount = 0;

            for (const user of users) {
                await processUserPayouts(user._id);
                processedCount++;
            }

            console.log(`Processed retroactive payouts for ${processedCount} user(s)`);
            return processedCount;
        } catch (error) {
            console.error('Error processing retroactive payouts:', error);
            throw error;
        }
    }

    static shouldBotBeCompleted(bot) {
        if (!bot.purchasedAt) return false;

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
