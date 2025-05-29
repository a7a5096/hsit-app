import express from 'express';
import axios from 'axios';
import ExchangeRate from '../models/ExchangeRate.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/exchange-rates/ubt-usdt
 * @desc    Get current UBT to USDT exchange rate
 * @access  Public
 */
router.get('/ubt-usdt', async (req, res) => {
  try {
    // Find the current rate in the database
    let exchangeRate = await ExchangeRate.findOne({ 
      fromCurrency: 'UBT', 
      toCurrency: 'USDT' 
    });
    
    // If rate exists and was updated in the last hour, return it
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (exchangeRate && exchangeRate.lastUpdated > oneHourAgo) {
      return res.json({
        success: true,
        rate: exchangeRate.rate,
        lastUpdated: exchangeRate.lastUpdated
      });
    }
    
    // Otherwise, fetch a new rate (in production, this would call an external API)
    // For this implementation, we'll use a simulated rate with slight variations
    const baseRate = 0.0325;
    const variation = (Math.random() * 0.002) - 0.001; // Random variation between -0.001 and +0.001
    const newRate = baseRate + variation;
    
    // If we already have a record, update it
    if (exchangeRate) {
      exchangeRate.rate = newRate;
      exchangeRate.lastUpdated = Date.now();
      await exchangeRate.save();
    } else {
      // Otherwise create a new record
      exchangeRate = new ExchangeRate({
        fromCurrency: 'UBT',
        toCurrency: 'USDT',
        rate: newRate
      });
      await exchangeRate.save();
    }
    
    // Return the updated rate
    res.json({
      success: true,
      rate: exchangeRate.rate,
      lastUpdated: exchangeRate.lastUpdated
    });
    
  } catch (error) {
    console.error('Error fetching UBT/USDT rate:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching exchange rate' 
    });
  }
});

/**
 * @route   POST /api/exchange-rates/update
 * @desc    Force update of exchange rates (admin only)
 * @access  Private/Admin
 */
router.post('/update', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // In production, this would call external APIs to get the latest rates
    // For this implementation, we'll use a simulated rate with slight variations
    const baseRate = 0.0325;
    const variation = (Math.random() * 0.002) - 0.001; // Random variation between -0.001 and +0.001
    const newRate = baseRate + variation;
    
    // Update or create the UBT/USDT rate
    let exchangeRate = await ExchangeRate.findOne({ 
      fromCurrency: 'UBT', 
      toCurrency: 'USDT' 
    });
    
    if (exchangeRate) {
      exchangeRate.rate = newRate;
      exchangeRate.lastUpdated = Date.now();
      await exchangeRate.save();
    } else {
      exchangeRate = new ExchangeRate({
        fromCurrency: 'UBT',
        toCurrency: 'USDT',
        rate: newRate
      });
      await exchangeRate.save();
    }
    
    res.json({
      success: true,
      message: 'Exchange rates updated successfully',
      rate: exchangeRate.rate,
      lastUpdated: exchangeRate.lastUpdated
    });
    
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating exchange rates' 
    });
  }
});

export default router;
