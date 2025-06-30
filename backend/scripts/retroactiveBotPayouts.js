import BotCompletionService from '../services/botCompletionService.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * One-time script to apply retroactive payouts to all existing completed bots
 */
async function applyRetroactivePayouts() {
    try {
        console.log('Starting retroactive bot payout application...');
        
        // Connect to database
        await connectDB();
        
        // First, let's see what we're working with
        const allUsers = await User.find({ 'bots': { $exists: true, $ne: [] } });
        console.log(`Found ${allUsers.length} users with bots`);
        
        let totalBotsFound = 0;
        let totalBotsToProcess = 0;
        
        // Analyze current state
        for (const user of allUsers) {
            console.log(`\nUser: ${user.username} (${user.email})`);
            console.log(`Current UBT Balance: ${user.balances?.ubt || 0}`);
            
            if (user.bots && user.bots.length > 0) {
                console.log(`Bots owned: ${user.bots.length}`);
                
                for (const bot of user.bots) {
                    totalBotsFound++;
                    console.log(`  - Bot ID: ${bot.botId}, Name: ${bot.name}, Status: ${bot.status || 'unknown'}`);
                    console.log(`    Purchased: ${bot.purchasedAt}, Investment: ${bot.investmentAmount}`);
                    console.log(`    Payout Processed: ${bot.payoutProcessed || false}`);
                    
                    const shouldBeCompleted = BotCompletionService.shouldBotBeCompleted(bot);
                    if (shouldBeCompleted && !bot.payoutProcessed) {
                        totalBotsToProcess++;
                        console.log(`    *** NEEDS RETROACTIVE PAYOUT ***`);
                    }
                }
            }
        }
        
        console.log(`\n=== SUMMARY ===`);
        console.log(`Total bots found: ${totalBotsFound}`);
        console.log(`Bots needing retroactive payout: ${totalBotsToProcess}`);
        
        if (totalBotsToProcess > 0) {
            console.log('\nProceeding with retroactive payouts...');
            const processedCount = await BotCompletionService.processRetroactivePayouts();
            console.log(`Successfully processed ${processedCount} retroactive payouts`);
            
            // Show updated balances
            console.log('\n=== UPDATED BALANCES ===');
            const updatedUsers = await User.find({ 'bots': { $exists: true, $ne: [] } });
            for (const user of updatedUsers) {
                if (user.bots && user.bots.some(bot => bot.payoutProcessed)) {
                    console.log(`${user.username}: ${user.balances?.ubt || 0} UBT`);
                }
            }
        } else {
            console.log('No bots need retroactive payouts.');
        }
        
        console.log('\nRetroactive payout application completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('Error applying retroactive payouts:', error);
        process.exit(1);
    }
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    applyRetroactivePayouts();
}

export default applyRetroactivePayouts;

