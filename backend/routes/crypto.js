import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import * as qrcode from 'qrcode';
import CryptoAddressService from '../services/CryptoAddressService.js';
import addressAssignmentService from '../services/addressAssignmentService.js';

const router = express.Router();

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate QR code for a crypto address
 * @param {string} address - Crypto address
 * @param {string} outputPath - Path to save the QR code image
 * @returns {Promise} - QR code generation result
 */
const generateQRCode = async (address, outputPath) => {
  try {
    await qrcode.toFile(outputPath, address, {
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return {
      success: true,
      path: outputPath
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

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

/**
 * Generate QR code for crypto address
 * @route   GET /api/crypto/qrcode/:currency
 * @desc    Generate QR code for crypto address
 * @access  Private
 */
router.get('/qrcode/:currency', authMiddleware, async (req, res) => {
  const { currency } = req.params;
  const userId = req.user.id;
  
  try {
    // Map currency parameter to database currency code
    let dbCurrency;
    let currencyKey;
    
    if (currency.toLowerCase() === 'bitcoin' || currency.toLowerCase() === 'btc') {
      dbCurrency = 'BTC';
      currencyKey = 'bitcoin';
    } else if (currency.toLowerCase() === 'ethereum' || currency.toLowerCase() === 'eth') {
      dbCurrency = 'ETH';
      currencyKey = 'ethereum';
    } else if (currency.toLowerCase() === 'usdt') {
      dbCurrency = 'USDT';
      currencyKey = 'usdt';
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid currency. Supported: bitcoin/btc, ethereum/eth, usdt'
      });
    }
    
    // Get addresses for the user
    const addresses = await addressAssignmentService.getUserAddresses(userId);
    
    const address = addresses[dbCurrency];
    
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        message: `No ${currencyKey} address assigned to user`
      });
    }
    
    // Generate QR code
    const qrDir = path.join(__dirname, '../../public/qrcodes');
    
    // Ensure directory exists
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    
    const qrFilename = `${userId}_${currencyKey}_${Date.now()}.png`;
    const qrPath = path.join(qrDir, qrFilename);
    
    const qrResult = await generateQRCode(address, qrPath);
    
    if (!qrResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate QR code',
        error: qrResult.error
      });
    }
    
    // Return QR code URL
    const qrUrl = `/qrcodes/${qrFilename}`;
    
    res.json({
      success: true,
      address: address,
      qrcode: qrUrl
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while generating QR code',
      error: error.message
    });
  }
});

export default router;
