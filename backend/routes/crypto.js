const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const CryptoAddress = require('../models/CryptoAddress');
const { generateQRCode } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');
const cryptoAddressService = require('../services/cryptoAddressService').default;

// @route   GET api/crypto/addresses
// @desc    Get user's crypto addresses
// @access  Private
router.get('/addresses', auth, async (req, res) => {
  try {
    // Get user's crypto addresses from the database
    const result = await cryptoAddressService.getUserCryptoAddresses(req.user.id);
    
    if (!result.success) {
      return res.status(404).json({ msg: result.message });
    }

    // Return addresses
    res.json({
      btcAddress: result.addresses.btcAddress,
      ethAddress: result.addresses.ethAddress
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/crypto/assign/:currency
// @desc    Assign a crypto address to the user if they don't have one
// @access  Private
router.get('/assign/:currency', auth, async (req, res) => {
  const { currency } = req.params;
  
  try {
    // Validate currency
    if (!['BTC', 'ETH', 'USDT'].includes(currency.toUpperCase())) {
      return res.status(400).json({ msg: 'Invalid currency' });
    }
    
    // Assign address
    const result = await cryptoAddressService.assignCryptoAddress(req.user.id, currency.toUpperCase());
    
    if (!result.success) {
      return res.status(400).json({ msg: result.message });
    }
    
    res.json({
      success: true,
      address: result.address,
      message: result.message
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/crypto/qrcode/:currency
// @desc    Generate QR code for crypto address
// @access  Private
router.get('/qrcode/:currency', auth, async (req, res) => {
  const { currency } = req.params;
  
  try {
    // Get user's crypto addresses
    const result = await cryptoAddressService.getUserCryptoAddresses(req.user.id);
    
    if (!result.success) {
      return res.status(404).json({ msg: result.message });
    }
    
    let address;
    if (currency.toUpperCase() === 'BTC') {
      address = result.addresses.btcAddress;
    } else if (['ETH', 'USDT'].includes(currency.toUpperCase())) {
      // USDT uses ETH address (ERC-20)
      address = result.addresses.ethAddress;
    } else {
      return res.status(400).json({ msg: 'Invalid currency' });
    }

    if (!address) {
      return res.status(404).json({ msg: 'Address not found' });
    }

    // Create directory for QR codes if it doesn't exist
    const qrDir = path.join(__dirname, '../../public/qrcodes');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    // Generate a safe filename for the QR code
    const safeUserId = String(req.user.id).replace(/[^a-zA-Z0-9]/g, '');
    const safeCurrency = currency.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${safeUserId}_${safeCurrency}.png`;
    const qrPath = path.join(qrDir, fileName);
    
    const qrResult = await generateQRCode(address, qrPath);

    if (!qrResult.success) {
      return res.status(500).json({ msg: 'Failed to generate QR code' });
    }

    // Return QR code URL path - using a proper URL format
    res.json({
      qrPath: `/qrcodes/${fileName}`,
      address
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/crypto/import-addresses
// @desc    Import crypto addresses from array
// @access  Private (Admin only - will need additional middleware)
router.post('/import-addresses', auth, async (req, res) => {
  try {
    const { addresses, type } = req.body;
    
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ msg: 'Addresses array is required' });
    }
    
    if (!type || !['BTC', 'ETH', 'USDT'].includes(type.toUpperCase())) {
      return res.status(400).json({ msg: 'Valid crypto type is required' });
    }
    
    // Import addresses
    const result = await cryptoAddressService.importCryptoAddresses(addresses, type.toUpperCase());
    
    if (!result.success) {
      return res.status(500).json({ msg: result.message });
    }
    
    res.json({
      msg: 'Addresses imported successfully',
      count: result.importCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
