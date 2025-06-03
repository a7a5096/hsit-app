import express from 'express';
import authMiddleware from '../middleware/auth.js';
import CryptoAsset from '../models/CryptoAsset.js';

const router = express.Router();

/**
 * @route   GET /api/direct_crypto_asset
 * @desc    Get direct crypto asset data from database
 * @access  Private (requires authentication)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Fetch crypto data directly from database
        const cryptoData = await fetchCryptoDataFromDb();
        
        if (!cryptoData) {
            return res.status(404).json({
                success: false,
                message: 'No crypto rate data available in the database',
                status: 'error'
            });
        }
        
        res.json({
            success: true,
            ...cryptoData
        });
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to fetch crypto data at this time',
            status: 'error'
        });
    }
});

/**
 * Helper function to fetch crypto data from database only
 * No external API calls or placeholder values
 */
async function fetchCryptoDataFromDb() {
    try {
        // Get from database (most recent entries)
        const dbRates = await CryptoAsset.find({})
            .sort({ lastUpdated: -1 })
            .limit(10);
        
        if (!dbRates || dbRates.length === 0) {
            console.warn('No crypto rates found in database');
            return null;
        }
        
        // Convert to the format expected by the frontend
        const formattedRates = {};
        dbRates.forEach(rate => {
            formattedRates[rate.pair] = rate.rate;
        });
        
        return {
            rates: formattedRates,
            lastUpdated: dbRates[0].lastUpdated,
            source: 'database'
        };
    } catch (error) {
        console.error('Error fetching crypto data from database:', error);
        throw error; // Let the route handler catch and handle this error
    }
}

export default router;
