import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';
import crypto from 'crypto';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import auth from '../middleware/auth.js';

// Import AddressService
import AddressService from '../services/AddressService.js';

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

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    // Your existing user creation logic
    const { username, email, phone, password, invitationCode, requirePhoneVerification } = req.body;

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
    
    // Auto-assign addresses
    AddressService.assignAddressesToUser(user._id)
      .then(addresses => {
        console.log(`Assigned addresses to new user ${user._id}:`, addresses);
      })
      .catch(error => {
        console.error(`Failed to assign addresses to new user ${user._id}:`, error.message);
      });

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

    // Assign crypto addresses to user using the database service
    try {
      const addresses = await AddressService.assignAddressesToUser(userId);
      if (!addresses) {
        console.error(`Failed to assign addresses to user ${userId}`);
      }
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

export default router;
