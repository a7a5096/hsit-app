import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authMiddleware from '../middleware/auth.js';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import * as qrcode from 'qrcode';

const router = express.Router();

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load crypto addresses from CSV files
 * @returns {Object} - Object containing addresses by currency type
 */
const loadCryptoAddressesFromCSV = () => {
  try {
    // Use relative paths for development, can be updated for production
    const csvDir = path.join(__dirname, '../../csv');
    
    const bitcoinPath = path.join(csvDir, 'bitcoin.csv');
    const ethereumPath = path.join(csvDir, 'ethereum.csv');
    const usdtPath = path.join(csvDir, 'usdt.csv');
    
    // Read and parse CSV files
    const bitcoinAddresses = fs.readFileSync(bitcoinPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    const ethereumAddresses = fs.readFileSync(ethereumPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    const usdtAddresses = fs.readFileSync(usdtPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return {
      success: true,
      bitcoin: bitcoinAddresses,
      ethereum: ethereumAddresses,
      usdt: usdtAddresses
    };
  } catch (error) {
    console.error('Error loading crypto addresses from CSV:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

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
 * Import crypto addresses from CSV files to database
 * This should be run once to initialize the database with addresses
 */
router.post('/import-addresses', authMiddleware, async (req, res) => {
  try {
    // This should be protected with admin middleware in production
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Load addresses from CSV files
    const addresses = loadCryptoAddressesFromCSV();
    if (!addresses.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load addresses from CSV files',
        error: addresses.error
      });
    }
    
    // Import Bitcoin addresses
    let bitcoinCount = 0;
    for (const address of addresses.bitcoin) {
      // Check if address already exists
      const existingAddress = await CryptoAddress.findOne({ 
        address: address,
        currency: 'bitcoin'
      });
      
      if (!existingAddress) {
        const newAddress = new CryptoAddress({
          address: address,
          currency: 'bitcoin',
          privateKey: 'PLACEHOLDER', // In production, this should be securely managed
          used: false
        });
        await newAddress.save();
        bitcoinCount++;
      }
    }
    
    // Import Ethereum addresses
    let ethereumCount = 0;
    for (const address of addresses.ethereum) {
      // Check if address already exists
      const existingAddress = await CryptoAddress.findOne({ 
        address: address,
        currency: 'ethereum'
      });
      
      if (!existingAddress) {
        const newAddress = new CryptoAddress({
          address: address,
          currency: 'ethereum',
          privateKey: 'PLACEHOLDER', // In production, this should be securely managed
          used: false
        });
        await newAddress.save();
        ethereumCount++;
      }
    }
    
    // Import USDT addresses (typically same as Ethereum for ERC-20 tokens)
    let usdtCount = 0;
    for (const address of addresses.usdt) {
      // Check if address already exists
      const existingAddress = await CryptoAddress.findOne({ 
        address: address,
        currency: 'usdt'
      });
      
      if (!existingAddress) {
        const newAddress = new CryptoAddress({
          address: address,
          currency: 'usdt',
          privateKey: 'PLACEHOLDER', // In production, this should be securely managed
          used: false
        });
        await newAddress.save();
        usdtCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'Addresses imported successfully',
      imported: {
        bitcoin: bitcoinCount,
        ethereum: ethereumCount,
        usdt: usdtCount
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
    // Use findOneAndUpdate to atomically check and update the user
    // This prevents race conditions when multiple requests come in for the same user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user already has addresses assigned
    if (user.walletAddresses && user.walletAddresses.bitcoin && user.walletAddresses.ethereum) {
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
    
    // Find and assign Bitcoin address with findOneAndUpdate to atomically mark as used
    const bitcoinAddress = await CryptoAddress.findOneAndUpdate(
      { currency: 'bitcoin', used: false, assignedTo: { $exists: false } },
      { 
        used: true, 
        assignedTo: user._id, 
        assignedAt: new Date() 
      },
      { new: true }
    );
    
    if (!bitcoinAddress) {
      return res.status(500).json({ 
        success: false, 
        message: 'No available Bitcoin addresses'
      });
    }
    
    // Find and assign Ethereum address with findOneAndUpdate to atomically mark as used
    const ethereumAddress = await CryptoAddress.findOneAndUpdate(
      { currency: 'ethereum', used: false, assignedTo: { $exists: false } },
      { 
        used: true, 
        assignedTo: user._id, 
        assignedAt: new Date() 
      },
      { new: true }
    );
    
    if (!ethereumAddress) {
      // Revert Bitcoin address assignment if Ethereum address assignment fails
      await CryptoAddress.findByIdAndUpdate(
        bitcoinAddress._id,
        { used: false, $unset: { assignedTo: "", assignedAt: "" } }
      );
      
      return res.status(500).json({ 
        success: false, 
        message: 'No available Ethereum addresses'
      });
    }
    
    // Find and assign USDT address with findOneAndUpdate to atomically mark as used
    const usdtAddress = await CryptoAddress.findOneAndUpdate(
      { currency: 'usdt', used: false, assignedTo: { $exists: false } },
      { 
        used: true, 
        assignedTo: user._id, 
        assignedAt: new Date() 
      },
      { new: true }
    );
    
    if (!usdtAddress) {
      // Use Ethereum address for USDT if no dedicated USDT address is available
      console.log('No dedicated USDT address available, using Ethereum address');
    }
    
    // Initialize walletAddresses object if it doesn't exist
    if (!user.walletAddresses) {
      user.walletAddresses = {};
    }
    
    // Update user with assigned addresses
    user.walletAddresses.bitcoin = bitcoinAddress.address;
    user.walletAddresses.ethereum = ethereumAddress.address;
    user.walletAddresses.usdt = usdtAddress ? usdtAddress.address : ethereumAddress.address;
    
    await user.save();
    
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
      // Assign addresses if not already assigned
      // Find and assign Bitcoin address with findOneAndUpdate to atomically mark as used
      if (!user.walletAddresses.bitcoin) {
        const bitcoinAddress = await CryptoAddress.findOneAndUpdate(
          { currency: 'bitcoin', used: false, assignedTo: { $exists: false } },
          { 
            used: true, 
            assignedTo: user._id, 
            assignedAt: new Date() 
          },
          { new: true }
        );
        
        if (bitcoinAddress) {
          user.walletAddresses.bitcoin = bitcoinAddress.address;
        } else {
          console.error('No available Bitcoin addresses');
        }
      }
      
      // Find and assign Ethereum address with findOneAndUpdate to atomically mark as used
      if (!user.walletAddresses.ethereum) {
        const ethereumAddress = await CryptoAddress.findOneAndUpdate(
          { currency: 'ethereum', used: false, assignedTo: { $exists: false } },
          { 
            used: true, 
            assignedTo: user._id, 
            assignedAt: new Date() 
          },
          { new: true }
        );
        
        if (ethereumAddress) {
          user.walletAddresses.ethereum = ethereumAddress.address;
        } else {
          console.error('No available Ethereum addresses');
        }
      }
      
      // Find and assign USDT address with findOneAndUpdate to atomically mark as used
      if (!user.walletAddresses.usdt) {
        const usdtAddress = await CryptoAddress.findOneAndUpdate(
          { currency: 'usdt', used: false, assignedTo: { $exists: false } },
          { 
            used: true, 
            assignedTo: user._id, 
            assignedAt: new Date() 
          },
          { new: true }
        );
        
        if (usdtAddress) {
          user.walletAddresses.usdt = usdtAddress.address;
        } else if (user.walletAddresses.ethereum) {
          // Use Ethereum address for USDT if no dedicated USDT address is available
          user.walletAddresses.usdt = user.walletAddresses.ethereum;
          console.log('No dedicated USDT address available, using Ethereum address');
        } else {
          console.error('No available USDT or Ethereum addresses');
        }
      }
      
      // Save the updated user
      await user.save();
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
    
    // If address is not assigned, assign one now
    if (!address) {
      const cryptoAddress = await CryptoAddress.findOneAndUpdate(
        { currency: currencyKey, used: false, assignedTo: { $exists: false } },
        { 
          used: true, 
          assignedTo: user._id, 
          assignedAt: new Date() 
        },
        { new: true }
      );
      
      if (cryptoAddress) {
        address = cryptoAddress.address;
        user.walletAddresses[currencyKey] = address;
        await user.save();
      } else {
        return res.status(404).json({ 
          success: false, 
          message: `No available ${currencyKey} addresses`
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
    
    // If address is not assigned, assign one now
    if (!address) {
      const cryptoAddress = await CryptoAddress.findOneAndUpdate(
        { currency: currencyKey, used: false, assignedTo: { $exists: false } },
        { 
          used: true, 
          assignedTo: user._id, 
          assignedAt: new Date() 
        },
        { new: true }
      );
      
      if (cryptoAddress) {
        address = cryptoAddress.address;
        user.walletAddresses[currencyKey] = address;
        await user.save();
      } else {
        return res.status(404).json({ 
          success: false, 
          message: `No available ${currencyKey} addresses`
        });
      }
    }
    
    // Create directory for QR codes if it doesn't exist
    const qrDir = path.join(__dirname, '../../public/qrcodes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    
    // Generate a safe filename for the QR code
    const safeUserId = String(user._id).replace(/[^a-zA-Z0-9]/g, '');
    const safeCurrency = currency.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${safeUserId}_${safeCurrency}.png`;
    const qrPath = path.join(qrDir, fileName);
    
    const result = await generateQRCode(address, qrPath);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate QR code'
      });
    }
    
    // Return QR code URL path
    res.json({
      success: true,
      qrPath: `/qrcodes/${fileName}`,
      address: address
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

/**
 * Get user's UBT balance
 * @route   GET /api/crypto/balance/ubt
 * @desc    Get user's UBT balance from database
 * @access  Private
 */
router.get('/balance/ubt', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Return UBT balance from database
    res.json({
      success: true,
      balance: user.balances.ubt || 0
    });
  } catch (error) {
    console.error('Error getting UBT balance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving UBT balance',
      error: error.message
    });
  }
});

export default router;
