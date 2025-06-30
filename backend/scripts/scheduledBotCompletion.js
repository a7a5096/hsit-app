import BotCompletionService from '../services/botCompletionService.js';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Scheduled task to process bot completions
 * This should be run daily via cron job or similar scheduler
 */
async function runBotCompletionTask() {
    try {
        console.log('Starting scheduled bot completion task...');
        
        // Connect to database
        await connectDB();
        
        // Process completed bots
        const processedCount = await BotCompletionService.processCompletedBots();
        
        console.log(`Scheduled task completed. Processed ${processedCount} bots.`);
        
        // Exit gracefully
        process.exit(0);
        
    } catch (error) {
        console.error('Error in scheduled bot completion task:', error);
        process.exit(1);
    }
}

// Run the task if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runBotCompletionTask();
}

export default runBotCompletionTask;

