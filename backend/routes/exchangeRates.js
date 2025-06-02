import express from 'express';
import authMiddleware from '../middleware/auth.js'; // Assuming auth might be needed for some rate-related actions, though GET usually is public
import ExchangeRate from '../models/ExchangeRate.js'; // Your Mongoose model for exchange rates

const router = express.Router();

// @route   GET api/exchange-rates/:pair
// @desc    Get the exchange rate for a specific pair (e.g., ubt-usdt, btc-usdt, eth-usdt)
// @access  Public (typically)
router.get('/:pair', async (req, res) => {
    const pair = req.params.pair.toLowerCase(); // e.g., "ubt-usdt"

    // Placeholder static rates for common pairs if not found in DB
    // For a real application, these should come from a database or live API.
    const placeholderRates = {
        'ubt-usdt': { rate: 1.0, source: 'fixed' },      // Assuming 1 UBT = 1 USDT for now
        'btc-usdt': { rate: 60000.00, source: 'placeholder' }, // Example: 1 BTC = 60000 USDT
        'eth-usdt': { rate: 3500.00, source: 'placeholder' }   // Example: 1 ETH = 3500 USDT
        // Add other pairs if needed, e.g., 'usdt-usd': { rate: 1.0, source: 'fixed' }
    };

    try {
        // Attempt to find the rate in the database first
        const dbRate = await ExchangeRate.findOne({ pair: pair }).sort({ lastUpdated: -1 });

        if (dbRate) {
            return res.json({
                success: true,
                pair: dbRate.pair.toUpperCase(),
                rate: dbRate.rate,
                lastUpdated: dbRate.lastUpdated,
                source: dbRate.source || 'database'
            });
        } else if (placeholderRates[pair]) {
            // If not in DB, use placeholder if available
            const rateData = placeholderRates[pair];
            console.log(`Using placeholder rate for ${pair.toUpperCase()}`);
            return res.json({
                success: true,
                pair: pair.toUpperCase(),
                rate: rateData.rate,
                lastUpdated: new Date().toISOString(), // Use current time for placeholder
                source: rateData.source
            });
        } else {
            // If no rate found in DB or placeholders
            return res.status(404).json({
                success: false,
                message: `Exchange rate for pair ${pair.toUpperCase()} not found.`
            });
        }
    } catch (error) {
        console.error(`Error fetching exchange rate for ${pair.toUpperCase()}:`, error);
        res.status(500).json({ success: false, message: 'Server error while fetching exchange rate.' });
    }
});

// Example: POST route to update or add exchange rates (admin protected)
// You would need an admin role check in your authMiddleware or a specific admin middleware
// For simplicity, using general authMiddleware here.
router.post('/', authMiddleware, async (req, res) => {
    // Basic admin check (highly simplified - implement proper role management)
    if (req.user.id !== process.env.ADMIN_USER_ID && req.user.username !== 'admin_username_placeholder') {
         // return res.status(403).json({ success: false, message: "Not authorized to update exchange rates." });
         // For now, allowing any authenticated user to post for easier setup, but secure this!
    }

    const { pair, rate, source } = req.body;
    if (!pair || typeof rate !== 'number' || rate <= 0) {
        return res.status(400).json({ success: false, message: 'Pair and a valid positive rate are required.' });
    }

    try {
        const normalizedPair = pair.toLowerCase();
        let exchangeRate = await ExchangeRate.findOne({ pair: normalizedPair });

        if (exchangeRate) {
            // Update existing rate
            exchangeRate.rate = rate;
            exchangeRate.source = source || 'manual_update';
            exchangeRate.lastUpdated = new Date();
        } else {
            // Create new rate
            exchangeRate = new ExchangeRate({
                pair: normalizedPair,
                rate,
                source: source || 'manual_update',
                lastUpdated: new Date()
            });
        }
        await exchangeRate.save();
        res.status(201).json({ success: true, message: `Exchange rate for ${normalizedPair.toUpperCase()} saved.`, rate: exchangeRate });
    } catch (error) {
        console.error('Error saving exchange rate:', error);
        res.status(500).json({ success: false, message: 'Server error while saving exchange rate.' });
    }
});

export default router;
