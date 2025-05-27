import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import * as qrcode from 'qrcode';
import CryptoAddressService from '../services/CryptoAddressService.js';

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
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Use findOneAndUpdate to atomically check and update the user
      const user = await User.findById(req.user.id).session(session);
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Check if user already has addresses assigned
      if (user.walletAddresses && user.walletAddresses.bitcoin && user.walletAddresses.ethereum) {
        await session.abortTransaction();
        session.endSession();
        return res.json({
          success: true,
          message: 'User already has addresses assigned',
          addresses: {
            bitcoin: user.walletAddresses.bitcoin,
            ethereum: user.walletAddresses.ethereum,
            usdt: user.walletAddresses.usdt || user.walletAddresses.ethereum // USDT uses Ethereum address (ERC-20)
          }
        });
      }
      
      // Find and assign Bitcoin address
      const bitcoinAddress = await CryptoAddress.findOneAndUpdate(
        { currency: 'BTC', isAssigned: false, isActive: true },
        { 
          isAssigned: true, 
          assignedTo: user._id, 
          assignedAt: new Date() 
        },
        { new: true, session }
      );
      
      if (!bitcoinAddress) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ 
          success: false, 
          message: 'No available Bitcoin addresses'
        });
      }
      
      // Find and assign Ethereum address
      const ethereumAddress = await CryptoAddress.findOneAndUpdate(
        { currency: 'ETH', isAssigned: false, isActive: true },
        { 
          isAssigned: true, 
          assignedTo: user._id, 
          assignedAt: new Date() 
        },
        { new: true, session }
      );
      
      if (!ethereumAddress) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ 
          success: false, 
          message: 'No available Ethereum addresses'
        });
      }
      
      // Find and assign USDT address
      const usdtAddress = await CryptoAddress.findOneAndUpdate(
        { currency: 'USDT', isAssigned: false, isActive: true },
        { 
          isAssigned: true, 
          assignedTo: user._id, 
          assignedAt: new Date() 
        },
        { new: true, session }
      );
      
      // Initialize walletAddresses object if it doesn't exist
      if (!user.walletAddresses) {
        user.walletAddresses = {};
      }
      
      // Update user with assigned addresses
      user.walletAddresses.bitcoin = bitcoinAddress.address;
      user.walletAddresses.ethereum = ethereumAddress.address;
      user.walletAddresses.usdt = usdtAddress ? usdtAddress.address : ethereumAddress.address;
      
      await user.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      res.json({
        success: true,
        message: 'Addresses assigned successfully',
        addresses: {
          bitcoin: bitcoinAddress.address,
          ethereum: ethereumAddress.address,
          usdt: usdtAddress ? usdtAddress.address : ethereumAddress.address
        }
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error assigning addresses:', error);
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
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize walletAddresses object if it doesn't exist
    if (!user.walletAddresses) {
      user.walletAddresses = {};
      await user.save();
    }
    
    // Check if user has addresses assigned
    const needsAddresses = !user.walletAddresses.bitcoin || 
                          !user.walletAddresses.ethereum || 
                          !user.walletAddresses.usdt;
    
    if (needsAddresses) {
      // Use the service to assign addresses
      try {
        const addresses = await CryptoAddressService.assignAddressesToUser(user._id);
        if (addresses) {
          // Update user wallet addresses if assignment was successful
          if (!user.walletAddresses) {
            user.walletAddresses = {};
          }
          
          if (addresses.BTC && !user.walletAddresses.bitcoin) {
            user.walletAddresses.bitcoin = addresses.BTC;
          }
          
          if (addresses.ETH && !user.walletAddresses.ethereum) {
            user.walletAddresses.ethereum = addresses.ETH;
          }
          
          if (addresses.USDT && !user.walletAddresses.usdt) {
            user.walletAddresses.usdt = addresses.USDT;
          } else if (!user.walletAddresses.usdt && user.walletAddresses.ethereum) {
            // Use Ethereum address for USDT if no dedicated USDT address is available
            user.walletAddresses.usdt = user.walletAddresses.ethereum;
          }
          
          await user.save();
        }
      } catch (error) {
        console.error('Error assigning addresses:', error);
      }
    }
    
    // Return addresses
    res.json({
      success: true,
      addresses: {
        bitcoin: user.walletAddresses.bitcoin || null,
        ethereum: user.walletAddresses.ethereum || null,
        usdt: user.walletAddresses.usdt || user.walletAddresses.ethereum || null
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
});

/**
 * Get user's crypto addresses by currency
 * @route   GET /api/crypto/address/:currency
 * @desc    Get user's crypto address for a specific currency
 * @access  Private
 */
router.get('/address/:currency', authMiddleware, async (req, res) => {
  const { currency } = req.params;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize walletAddresses object if it doesn't exist
    if (!user.walletAddresses) {
      user.walletAddresses = {};
      await user.save();
    }
    
    let currencyKey;
    let dbCurrency;
    let address;
    
    if (currency.toLowerCase() === 'bitcoin' || currency.toLowerCase() === 'btc') {
      currencyKey = 'bitcoin';
      dbCurrency = 'BTC';
      address = user.walletAddresses.bitcoin;
    } else if (currency.toLowerCase() === 'ethereum' || currency.toLowerCase() === 'eth') {
      currencyKey = 'ethereum';
      dbCurrency = 'ETH';
      address = user.walletAddresses.ethereum;
    } else if (currency.toLowerCase() === 'usdt') {
      currencyKey = 'usdt';
      dbCurrency = 'USDT';
      address = user.walletAddresses.usdt || user.walletAddresses.ethereum; // Fallback to ETH
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid currency. Supported: bitcoin/btc, ethereum/eth, usdt'
      });
    }
    
    // If address is not assigned, assign one now
    if (!address) {
      try {
        // Find an available address
        const availableAddress = await CryptoAddress.findOneAndUpdate(
          { currency: dbCurrency, isAssigned: false, isActive: true },
          { 
            isAssigned: true, 
            assignedTo: user._id, 
            assignedAt: new Date() 
          },
          { new: true }
        );
        
        if (availableAddress) {
          address = availableAddress.address;
          user.walletAddresses[currencyKey] = address;
          await user.save();
        } else {
          return res.status(404).json({ 
            success: false, 
            message: `No available ${currencyKey} addresses`
          });
        }
      } catch (error) {
        console.error(`Error assigning ${currencyKey} address:`, error);
        return res.status(500).json({ 
          success: false, 
          message: `Error assigning ${currencyKey} address`,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      address: address
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
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize walletAddresses object if it doesn't exist
    if (!user.walletAddresses) {
      user.walletAddresses = {};
      await user.save();
    }
    
    let currencyKey;
    let address;
    
    if (currency.toLowerCase() === 'bitcoin' || currency.toLowerCase() === 'btc') {
      currencyKey = 'bitcoin';
      address = user.walletAddresses.bitcoin;
    } else if (currency.toLowerCase() === 'ethereum' || currency.toLowerCase() === 'eth') {
      currencyKey = 'ethereum';
      address = user.walletAddresses.ethereum;
    } else if (currency.toLowerCase() === 'usdt') {
      currencyKey = 'usdt';
      address = user.walletAddresses.usdt || user.walletAddresses.ethereum; // Fallback to ETH
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid currency. Supported: bitcoin/btc, ethereum/eth, usdt'
      });
    }
    
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
    
    const qrFilename = `${user._id}_${currencyKey}_${Date.now()}.png`;
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
