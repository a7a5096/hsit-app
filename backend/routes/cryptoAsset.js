import express from 'express';
import authMiddleware from '../middleware/auth.js';
import axios from 'axios';
import CryptoAsset from '../models/CryptoAsset.js';

const router = express.Router();

// UBT-USDT rate service with fallback
const cryptoRateCache = { 
    lastUpdated: null, 
    rates: {} 
};

// Update rates every 5 minutes
setInterval(updateCryptoRates, 5 * 60 * 1000);

async function updateCryptoRates() {
    try {
        // Primary source
        const response = await axios.get('https://api.exchange.com/v1/rates', {
            params: { 
                symbols: 'UBT-USDT,BTC-USDT,ETH-USDT' 
            }
        });
        cryptoRateCache.rates = response.data.rates;
        cryptoRateCache.lastUpdated = new Date();
        cryptoRateCache.source = 'primary';
        console.log('Crypto rates updated from primary source');
        
        // Store in database for persistence
        await storeCryptoRatesInDb(cryptoRateCache.rates, 'primary');
    } catch (primaryError) {
        console.error('Error fetching from primary source:', primaryError);
        try {
            // Fallback source
            const fallbackResponse = await axios.get('https://backup-api.crypto.com/rates');
            cryptoRateCache.rates = fallbackResponse.data.rates;
            cryptoRateCache.lastUpdated = new Date();
            cryptoRateCache.source = 'fallback';
            console.log('Crypto rates updated from fallback source');
            
            // Store in database for persistence
            await storeCryptoRatesInDb(cryptoRateCache.rates, 'fallback');
        } catch (fallbackError) {
            console.error('Error fetching from fallback source:', fallbackError);
            // If both sources fail and cache is older than 1 hour, use placeholder
            if (!cryptoRateCache.lastUpdated || (new Date() - cryptoRateCache.lastUpdated) > 60 * 60 * 1000) {
                console.warn('Using placeholder rates due to API failures');
                cryptoRateCache.rates = {
                    'UBT-USDT': 0.12, // Placeholder value
                    'BTC-USDT': 65000, // Placeholder value
                    'ETH-USDT': 3500 // Placeholder value
                };
                cryptoRateCache.lastUpdated = new Date();
                cryptoRateCache.source = 'placeholder';
                
                // Store placeholder rates in database
                await storeCryptoRatesInDb(cryptoRateCache.rates, 'placeholder');
            }
        }
    }
}

// Helper function to store rates in database
async function storeCryptoRatesInDb(rates, source) {
    try {
        // For each rate, update or create a record in the database
        for (const [pair, rate] of Object.entries(rates)) {
            const [fromCurrency, toCurrency] = pair.split('-');
            
            await CryptoAsset.findOneAndUpdate(
                { pair },
                { 
                    pair,
                    fromCurrency,
                    toCurrency,
                    rate,
                    source,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );
        }
    } catch (error) {
        console.error('Error storing crypto rates in database:', error);
    }
}

// @route   GET /api/direct_crypto_asset
// @desc    Get direct crypto asset data
// @access  Private (requires authentication)
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Initialize rates if not yet available
        if (!cryptoRateCache.lastUpdated) {
            await updateCryptoRates();
        }
        
        // Fetch real-time crypto data from a reliable source
        const cryptoData = await fetchCryptoData();
        
        res.json(cryptoData);
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        res.status(500).json({
            message: 'Unable to fetch crypto data at this time',
            status: 'error'
        });
    }
});

// Helper function to fetch crypto data
async function fetchCryptoData() {
    try {
        // First try to get from database (most recent entries)
        const dbRates = await CryptoAsset.find({})
            .sort({ lastUpdated: -1 })
            .limit(10);
        
        if (dbRates && dbRates.length > 0) {
            // Convert to the format expected by the frontend
            const formattedRates = {};
            dbRates.forEach(rate => {
                formattedRates[rate.pair] = rate.rate;
            });
            
            return {
                rates: formattedRates,
                lastUpdated: dbRates[0].lastUpdated,
                source: dbRates[0].source
            };
        }
        
        // If no database entries, use the cache
        if (cryptoRateCache.lastUpdated) {
            return {
                rates: cryptoRateCache.rates,
                lastUpdated: cryptoRateCache.lastUpdated,
                source: cryptoRateCache.source
            };
        }
        
        // If neither database nor cache has data, fetch from API
        const response = await axios.get('https://api.cryptoservice.com/prices');
        return {
            rates: response.data.rates,
            lastUpdated: new Date(),
            source: 'api_direct'
        };
    } catch (error) {
        console.error('Error in fetchCryptoData:', error);
        // Return placeholder data as last resort
        return {
            rates: {
                'UBT-USDT': 0.12,
                'BTC-USDT': 65000,
                'ETH-USDT': 3500
            },
            lastUpdated: new Date(),
            source: 'placeholder'
        };
    }
}

export default router;
