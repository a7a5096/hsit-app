import express from 'express';
import auth from '../middleware/auth.js';
import BotCompletionService from '../services/botCompletionService.js';

const router = express.Router();

// @route   POST api/bot-completion/process
// @desc    Manually trigger bot completion processing (admin only)
// @access  Private
router.post('/process', auth, async (req, res) => {
    try {
        const processedCount = await BotCompletionService.processCompletedBots();
        res.json({
            success: true,
            message: `Processed ${processedCount} completed bots`,
            processedCount
        });
    } catch (error) {
        console.error('Error processing bot completions:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing bot completions'
        });
    }
});

// @route   POST api/bot-completion/retroactive
// @desc    Process retroactive payouts for existing completed bots
// @access  Private
router.post('/retroactive', auth, async (req, res) => {
    try {
        const processedCount = await BotCompletionService.processRetroactivePayouts();
        res.json({
            success: true,
            message: `Processed ${processedCount} retroactive bot payouts`,
            processedCount
        });
    } catch (error) {
        console.error('Error processing retroactive payouts:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing retroactive payouts'
        });
    }
});

// @route   GET api/bot-completion/status
// @desc    Get status of bot completion system
// @access  Private
router.get('/status', auth, async (req, res) => {
    try {
        // This could be expanded to show system status, pending completions, etc.
        res.json({
            success: true,
            message: 'Bot completion system is operational',
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error getting bot completion status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting system status'
        });
    }
});

export default router;

