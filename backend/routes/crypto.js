import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import CryptoAddressService from '../services/CryptoAddressService.js';
import addressAssignmentService from '../services/addressAssignmentService.js';

const router = express.Router();

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Import crypto addresses from database to database
 * This endpoint should be used with admin privileges
 */
router.post('/import-addresses', authMiddleware, async (req, res) => {
  try {
    // This should be protected with admin middleware in production
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get addresses from request body
    const { bitcoin, ethereum, usdt } = req.body;
    
    if (!bitcoin || !ethereum || !usdt) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing address data. Please provide bitcoin, ethereum, and usdt arrays.'
      });
    }
    
    // Import Bitcoin addresses
    const bitcoinResults = await CryptoAddressService.importAddresses(
      bitcoin.map(address => ({
        address,
        currency: 'BTC',
        isAssigned: false,
        isActive: true
      }))
    );
    
    // Import Ethereum addresses
    const ethereumResults = await CryptoAddressService.importAddresses(
      ethereum.map(address => ({
        address,
        currency: 'ETH',
        isAssigned: false,
        isActive: true
      }))
    );
    
    // Import USDT addresses
    const usdtResults = await CryptoAddressService.importAddresses(
      usdt.map(address => ({
        address,
        currency: 'USDT',
        isAssigned: false,
        isActive: true
      }))
    );
    
    res.json({
      success: true,
      message: 'Addresses imported successfully',
      imported: {
        bitcoin: bitcoinResults.imported,
        ethereum: ethereumResults.imported,
        usdt: usdtResults.imported
      },
      duplicates: {
        bitcoin: bitcoinResults.duplicates,
        ethereum: ethereumResults.duplicates,
        usdt: usdtResults.duplicates
      },
      errors: {
        bitcoin: bitcoinResults.errors,
        ethereum: ethereumResults.errors,
        usdt: usdtResults.errors
      }
    });
  } catch (error) {
    console.error('Error importing addresses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during address import',
      error: error.message
    });
  }
});

/**
 * Assign crypto addresses to a user
 * @route   POST /api/crypto/assign-addresses
 * @desc    Assign crypto addresses to a user from the database
 * @access  Private
 */
router.post('/assign-addresses', authMiddleware, async (req, res) => {
  try {
    // Use the addressAssignmentService to assign addresses
    const userId = req.user.id;
    
    try {
      const addresses = await addressAssignmentService.assignAddressesToUser(userId);
      
      res.json({
        success: true,
        message: 'Addresses assigned successfully',
        addresses: {
          bitcoin: addresses.BTC,
          ethereum: addresses.ETH,
          usdt: addresses.USDT
        }
      });
    } catch (error) {
      console.error('Error assigning addresses:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error during address assignment',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error in assign-addresses route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during address assignment',
      error: error.message
    });
  }
});

/**
 * Get user's crypto addresses
 * @route   GET /api/crypto/addresses
 * @desc    Get user's crypto addresses or assign if not already assigned
 * @access  Private
 */
router.get('/addresses', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Use the addressAssignmentService to get or assign addresses
    try {
      const addresses = await addressAssignmentService.getUserAddresses(userId);
      
      res.json({
        success: true,
        addresses: {
          bitcoin: addresses.BTC,
          ethereum: addresses.ETH,
          usdt: addresses.USDT
        }
      });
    } catch (error) {
      console.error('Error getting addresses:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error while retrieving addresses',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error in addresses route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving addresses',
      error: error.message
    });
  }
});

/**
 * Get user's crypto addresses by currency
 * @route   GET /api/crypto/address/:currency
 * @desc    Get user's crypto address for a specific currency
 * @access  Private
 */
router.get('/address/:currency', authMiddleware, async (req, res) => {
  const { currency } = req.params;
  const userId = req.user.id;
  
  try {
    // Map currency parameter to database currency code
    let dbCurrency;
    
    if (currency.toLowerCase() === 'bitcoin' || currency.toLowerCase() === 'btc') {
      dbCurrency = 'BTC';
    } else if (currency.toLowerCase() === 'ethereum' || currency.toLowerCase() === 'eth') {
      dbCurrency = 'ETH';
    } else if (currency.toLowerCase() === 'usdt') {
      dbCurrency = 'USDT';
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid currency. Supported: bitcoin/btc, ethereum/eth, usdt'
      });
    }
    
    // Get addresses for the user
    const addresses = await addressAssignmentService.getUserAddresses(userId);
    
    // Return the specific address
    res.json({
      success: true,
      address: addresses[dbCurrency]
    });
  } catch (error) {
    console.error('Error getting address:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving address',
      error: error.message
    });
  }
});

export default router;
