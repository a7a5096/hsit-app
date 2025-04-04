const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const CryptoAddress = require('../models/CryptoAddress');
const { loadCryptoAddresses, generateQRCode } = require('../utils/helpers');
const path = require('path');
const fs = require('fs');

// @route   GET api/crypto/addresses
// @desc    Get user's crypto addresses
// @access  Private
router.get('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if user is verified
    if (!user.isPhoneVerified) {
      return res.status(403).json({ msg: 'Phone verification required before accessing crypto addresses' });
    }

    // Return addresses
    res.json({
      btcAddress: user.btcAddress,
      ethAddress: user.ethAddress
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
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if user is verified
    if (!user.isPhoneVerified) {
      return res.status(403).json({ msg: 'Phone verification required before accessing crypto addresses' });
    }

    let address;
    if (currency.toUpperCase() === 'BTC') {
      address = user.btcAddress;
    } else if (['ETH', 'USDT'].includes(currency.toUpperCase())) {
      // USDT uses ETH address (ERC-20)
      address = user.ethAddress;
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

    // Generate QR code
    const qrPath = path.join(qrDir, `${user.id}_${currency.toLowerCase()}.png`);
    const result = await generateQRCode(address, qrPath);

    if (!result.success) {
      return res.status(500).json({ msg: 'Failed to generate QR code' });
    }

    // Return QR code path
    res.json({
      qrPath: `/qrcodes/${user.id}_${currency.toLowerCase()}.png`,
      address
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/crypto/import-addresses
// @desc    Import crypto addresses from CSV files
// @access  Private (Admin only - will need additional middleware)
router.post('/import-addresses', auth, async (req, res) => {
  try {
    // This should be protected with admin middleware
    // For now, we'll just check if the user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Load addresses from CSV files
    const addresses = loadCryptoAddresses();
    if (!addresses.success) {
      return res.status(500).json({ msg: 'Failed to load addresses from CSV files' });
    }

    // Import BTC addresses
    let btcCount = 0;
    for (const address of addresses.btcAddresses) {
      // Check if address already exists
      const existingAddress = await CryptoAddress.findOne({ address, type: 'BTC' });
      if (!existingAddress) {
        const newAddress = new CryptoAddress({
          type: 'BTC',
          address,
          isAssigned: false
        });
        await newAddress.save();
        btcCount++;
      }
    }

    // Import ETH addresses
    let ethCount = 0;
    for (const address of addresses.ethAddresses) {
      // Check if address already exists
      const existingAddress = await CryptoAddress.findOne({ address, type: 'ETH' });
      if (!existingAddress) {
        const newAddress = new CryptoAddress({
          type: 'ETH',
          address,
          isAssigned: false
        });
        await newAddress.save();
        ethCount++;
      }
    }

    res.json({
      msg: 'Addresses imported successfully',
      btcCount,
      ethCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
