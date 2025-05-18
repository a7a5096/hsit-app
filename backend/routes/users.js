const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const CryptoAddress = require('../models/CryptoAddress');
const auth = require('../middleware/auth');

const router = express.Router();

// Initialize Twilio client
const twilioClient = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper function to generate verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to assign crypto addresses to user
const assignCryptoAddresses = async (userId) => {
  try {
    // Read CSV files for addresses
    const btcAddressesPath = path.join(process.cwd(), '../frontend/public/csv/bitcoin.csv');
    const ethAddressesPath = path.join(process.cwd(), '../frontend/public/csv/ethereum.csv');
    const usdtAddressesPath = path.join(process.cwd(), '../frontend/public/csv/USDT.csv');
    const usedAddressesPath = path.join(process.cwd(), '../frontend/public/csv/used.csv');
    
    // Read addresses from files
    const btcAddresses = fs.readFileSync(btcAddressesPath, 'utf8').split('\n').filter(addr => addr.trim());
    const ethAddresses = fs.readFileSync(ethAddressesPath, 'utf8').split('\n').filter(addr => addr.trim());
    const usdtAddresses = fs.readFileSync(usdtAddressesPath, 'utf8').split('\n').filter(addr => addr.trim());
    
    // Read used addresses
    let usedAddresses = [];
    try {
      usedAddresses = fs.readFileSync(usedAddressesPath, 'utf8').split('\n').filter(addr => addr.trim());
    } catch (err) {
      // If file doesn't exist, create it
      fs.writeFileSync(usedAddressesPath, '', 'utf8');
    }
    
    // Find unused addresses
    const unusedBtcAddresses = btcAddresses.filter(addr => !usedAddresses.includes(addr));
    const unusedEthAddresses = ethAddresses.filter(addr => !usedAddresses.includes(addr));
    const unusedUsdtAddresses = usdtAddresses.filter(addr => !usedAddresses.includes(addr));
    
    if (unusedBtcAddresses.length === 0 || unusedEthAddresses.length === 0 || unusedUsdtAddresses.length === 0) {
      throw new Error('Not enough unused addresses available');
    }
    
    // Select one address of each type
    const btcAddress = unusedBtcAddresses[0];
    const ethAddress = unusedEthAddresses[0];
    const usdtAddress = unusedUsdtAddresses[0];
    
    // Update user with addresses
    const user = await User.findById(userId);
    user.btcAddress = btcAddress;
    user.ethAddress = ethAddress;
    user.usdtAddress = usdtAddress;
    await user.save();
    
    // Mark addresses as used
    fs.appendFileSync(usedAddressesPath, btcAddress + '\n', 'utf8');
    fs.appendFileSync(usedAddressesPath, ethAddress + '\n', 'utf8');
    fs.appendFileSync(usedAddressesPath, usdtAddress + '\n', 'utf8');
    
    return { btcAddress, ethAddress, usdtAddress };
  } catch (err) {
    console.error('Error assigning crypto addresses:', err);
    throw err;
  }
};

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  const { username, email, phone, password, invitationCode, requirePhoneVerification } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
      phoneNumber: phone,
      isPhoneVerified: false,
      verificationMethod: 'phone'
    });

    // Handle invitation code if provided
    if (invitationCode) {
      const inviter = await User.findOne({ invitationCode });
      if (inviter) {
        user.invitedBy = inviter._id;
        inviter.invitedUsers.push(user._id);
        await inviter.save();
      }
    }

    // Generate unique invitation code for this user
    user.invitationCode = crypto.randomBytes(4).toString('hex');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // If phone verification is required, generate and send verification code
    if (requirePhoneVerification) {
      const verificationCode = generateVerificationCode();
      user.phoneVerificationCode = verificationCode;
      user.phoneVerificationExpires = Date.now() + 3600000; // 1 hour

      // Send SMS via Twilio
      try {
        await twilioClient.messages.create({
          body: `Your HSIT verification code is: ${verificationCode}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone
        });
      } catch (twilioErr) {
        console.error('Twilio error:', twilioErr);
        return res.status(500).json({ message: 'Failed to send verification SMS: ' + twilioErr.message });
      }
    } else {
      // If no verification required, mark as verified
      user.isPhoneVerified = true;
    }

    // Save user
    await user.save();

    // Return success with userId for verification redirect
    return res.status(201).json({
      message: 'Account created! Please verify your phone number.',
      userId: user._id
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// @route   POST api/users/verify-phone
// @desc    Verify phone number with code
// @access  Public
router.post('/verify-phone', async (req, res) => {
  const { userId, phone, verificationCode } = req.body;

  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if phone number matches
    if (user.phoneNumber !== phone) {
      return res.status(400).json({ message: 'Phone number does not match records' });
    }

    // Check if verification code is valid and not expired
    if (user.phoneVerificationCode !== verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.phoneVerificationExpires < Date.now()) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Mark phone as verified
    user.isPhoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;

    // Assign crypto addresses to user
    try {
      await assignCryptoAddresses(userId);
    } catch (addressErr) {
      console.error('Error assigning addresses:', addressErr);
      // Continue with verification even if address assignment fails
      // We'll handle this separately
    }

    // Save user
    await user.save();

    return res.status(200).json({ message: 'Phone verified successfully!' });
  } catch (err) {
    console.error('Verification error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/users/resend-verification
// @desc    Resend verification code
// @access  Public
router.post('/resend-verification', async (req, res) => {
  const { userId, phone } = req.body;

  try {
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if phone number matches
    if (user.phoneNumber !== phone) {
      return res.status(400).json({ message: 'Phone number does not match records' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    user.phoneVerificationCode = verificationCode;
    user.phoneVerificationExpires = Date.now() + 3600000; // 1 hour

    // Send SMS via Twilio
    try {
      await twilioClient.messages.create({
        body: `Your HSIT verification code is: ${verificationCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });

    } catch (twilioErr) {
      console.error('Twilio error:', twilioErr);
      return res.status(500).json({ message: 'Failed to send verification SMS: ' + twilioErr.message });
    }

    // Save user
    await user.save();

    return res.status(200).json({ message: 'Verification code resent successfully!' });
  } catch (err) {
    console.error('Resend error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
