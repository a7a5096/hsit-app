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
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if user already has addresses assigned
    if (user.walletAddresses.bitcoin && user.walletAddresses.ethereum) {
      return res.json({
        success: true,
        message: 'User already has addresses assigned',
        addresses: {
          bitcoin: user.walletAddresses.bitcoin,
          ethereum: user.walletAddresses.ethereum,
          usdt: user.walletAddresses.ethereum // USDT uses Ethereum address (ERC-20)
        }
      });
    }
    
    // Find and assign Bitcoin address
    const bitcoinAddress = await CryptoAddress.findOne({ 
      currency: 'bitcoin',
      used: false
    });
    
    if (!bitcoinAddress) {
      return res.status(500).json({ 
        success: false, 
        message: 'No available Bitcoin addresses'
      });
    }
    
    // Find and assign Ethereum address
    const ethereumAddress = await CryptoAddress.findOne({ 
      currency: 'ethereum',
      used: false
    });
    
    if (!ethereumAddress) {
      return res.status(500).json({ 
        success: false, 
        message: 'No available Ethereum addresses'
      });
    }
    
    // Mark addresses as used and assign to user
    bitcoinAddress.used = true;
    bitcoinAddress.assignedTo = user._id;
    bitcoinAddress.assignedAt = new Date();
    await bitcoinAddress.save();
    
    ethereumAddress.used = true;
    ethereumAddress.assignedTo = user._id;
    ethereumAddress.assignedAt = new Date();
    await ethereumAddress.save();
    
    // Update user with assigned addresses
    user.walletAddresses.bitcoin = bitcoinAddress.address;
    user.walletAddresses.ethereum = ethereumAddress.address;
    // USDT uses the same address as Ethereum (ERC-20 token)
    user.walletAddresses.ubt = ethereumAddress.address;
    await user.save();
    
    res.json({
      success: true,
      message: 'Addresses assigned successfully',
      addresses: {
        bitcoin: bitcoinAddress.address,
        ethereum: ethereumAddress.address,
        usdt: ethereumAddress.address // USDT uses Ethereum address (ERC-20)
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
    
    // Check if user has addresses assigned
    if (!user.walletAddresses.bitcoin || !user.walletAddresses.ethereum) {
      // Assign addresses if not already assigned
      // Find and assign Bitcoin address
      const bitcoinAddress = await CryptoAddress.findOne({ 
        currency: 'bitcoin',
        used: false
      });
      
      if (!bitcoinAddress) {
        return res.status(500).json({ 
          success: false, 
          message: 'No available Bitcoin addresses'
        });
      }
      
      // Find and assign Ethereum address
      const ethereumAddress = await CryptoAddress.findOne({ 
        currency: 'ethereum',
        used: false
      });
      
      if (!ethereumAddress) {
        return res.status(500).json({ 
          success: false, 
          message: 'No available Ethereum addresses'
        });
      }
      
      // Mark addresses as used and assign to user
      bitcoinAddress.used = true;
      bitcoinAddress.assignedTo = user._id;
      bitcoinAddress.assignedAt = new Date();
      await bitcoinAddress.save();
      
      ethereumAddress.used = true;
      ethereumAddress.assignedTo = user._id;
      ethereumAddress.assignedAt = new Date();
      await ethereumAddress.save();
      
      // Update user with assigned addresses
      user.walletAddresses.bitcoin = bitcoinAddress.address;
      user.walletAddresses.ethereum = ethereumAddress.address;
      // USDT uses the same address as Ethereum (ERC-20 token)
      user.walletAddresses.ubt = ethereumAddress.address;
      await user.save();
    }
    
    // Return addresses
    res.json({
      success: true,
      addresses: {
        bitcoin: user.walletAddresses.bitcoin,
        ethereum: user.walletAddresses.ethereum,
        usdt: user.walletAddresses.ethereum // USDT uses Ethereum address (ERC-20)
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
    
    let address;
    if (currency.toLowerCase() === 'bitcoin' || currency.toLowerCase() === 'btc') {
      address = user.walletAddresses.bitcoin;
    } else if (currency.toLowerCase() === 'ethereum' || currency.toLowerCase() === 'eth') {
      address = user.walletAddresses.ethereum;
    } else if (currency.toLowerCase() === 'usdt') {
      // USDT uses Ethereum address (ERC-20)
      address = user.walletAddresses.ethereum;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid currency. Supported: bitcoin/btc, ethereum/eth, usdt'
      });
    }
    
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        message: 'Address not found for this currency'
      });
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
    
    let address;
    if (currency.toLowerCase() === 'bitcoin' || currency.toLowerCase() === 'btc') {
      address = user.walletAddresses.bitcoin;
    } else if (currency.toLowerCase() === 'ethereum' || currency.toLowerCase() === 'eth') {
      address = user.walletAddresses.ethereum;
    } else if (currency.toLowerCase() === 'usdt') {
      // USDT uses Ethereum address (ERC-20)
      address = user.walletAddresses.ethereum;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid currency. Supported: bitcoin/btc, ethereum/eth, usdt'
      });
    }
    
    if (!address) {
      return res.status(404).json({ 
        success: false, 
        message: 'Address not found for this currency'
      });
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
