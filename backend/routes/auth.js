import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
// Models
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
const router = express.Router();
// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'hsit_jwt_secret_key_2025';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';
const UBT_INITIAL_EXCHANGE_RATE = process.env.UBT_INITIAL_EXCHANGE_RATE || 1;
// Import models
import VerificationCode from '../models/VerificationCode.js';
import PendingRegistration from '../models/PendingRegistration.js';
// Import migration utility and services
import { migrateCryptoAddressesFromCsv } from '../utils/cryptoMigration.js';
import AddressService from '../services/AddressService.js';
// Helper functions
const sendVerificationCode = async (phoneNumber) => {
  try {
    // Twilio integration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    const client = require('twilio')(accountSid, authToken);
    
    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store the code in database
    // First, delete any existing codes for this phone number
    await VerificationCode.deleteMany({ phoneNumber });
    
    // Create new verification code document
    const verificationCode = new VerificationCode({
      phoneNumber,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    await verificationCode.save();
    
    // Send SMS
    await client.messages.create({
      body: `Your HSIT verification code is: ${code}`,
      from: twilioPhone,
      to: phoneNumber
    });
    
    return true;
  } catch (error) {
    console.error('Send verification code error:', error);
    return false;
  }
};
const verifyCode = async (phoneNumber, code) => {
  try {
    // Find verification code in database
    const verificationCode = await VerificationCode.findOne({ phoneNumber });
    
    if (!verificationCode) {
      return { valid: false, message: 'Verification code not found' };
    }
    
    // Check if code has expired
    if (Date.now() > verificationCode.expiresAt) {
      await VerificationCode.deleteOne({ phoneNumber });
      return { valid: false, message: 'Verification code expired' };
    }
    
    // Check if code matches
    if (verificationCode.code !== code) {
      return { valid: false, message: 'Invalid verification code' };
    }
    
    // Delete verification code
    await VerificationCode.deleteOne({ phoneNumber });
    
    return { valid: true };
  } catch (error) {
    console.error('Verify code error:', error);
    return { valid: false, message: 'Server error' };
  }
};
// Get available crypto addresses
const getAvailableCryptoAddresses = async () => {
  try {
    // Get available addresses from AddressService
    return await AddressService.getAvailableAddresses();
  } catch (error) {
    console.error('Get available crypto addresses error:', error);
    return {};
  }
};
// Mark address as assigned
const markAddressAsAssigned = async (currency, address) => {
  try {
    // Mark address as assigned in AddressService
    await AddressService.markAddressAsAssigned(currency, address);
  } catch (error) {
    console.error(`Mark ${currency} address as assigned error:`, error);
  }
};
// Login route - authenticate user
router.post('/auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Email and password are required' 
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    // Check if user exists
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        msg: 'User with email ' + email + ' not found' 
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        msg: 'Invalid credentials' 
      });
    }
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
    
    // Return token and user data
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        walletAddresses: user.walletAddresses,
        isVerified: user.isVerified,
        balances: user.balances
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      msg: 'Server error' 
    });
  }
});
// Initial registration - send verification code
router.post('/register/initial', async (req, res) => {
  try {
    const { username, email, password, phoneNumber } = req.body;
    
    // Validate inputs
    if (!username || !email || !password || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        { username },
        { phoneNumber }
      ]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      } else {
        return res.status(400).json({ success: false, message: 'Username already taken' });
      }
    }
    
    // Send verification code
    const smsSent = await sendVerificationCode(phoneNumber);
    
    if (!smsSent) {
      return res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Store user data in database
    // First, delete any existing pending registrations for this phone number
    await PendingRegistration.deleteMany({ phoneNumber });
    
    // Create new pending registration
    const pendingRegistration = new PendingRegistration({
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    });
    
    await pendingRegistration.save();
    
    res.json({
      success: true,
      message: 'Verification code sent',
      phoneNumber
    });
  } catch (error) {
    console.error('Registration initial error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Direct registration route with auto-address assignment
router.post('/register', async (req, res) => {
  try {
    // Your existing user creation logic
    const user = new User(req.body);
    await user.save();
    
    // Auto-assign addresses
    AddressService.assignAddressesToUser(user._id)
      .then(addresses => {
        console.log(`Assigned addresses to new user ${user._id}:`, addresses);
      })
      .catch(error => {
        console.error(`Failed to assign addresses to new user ${user._id}:`, error.message);
      });
    res.json({ success: true, user, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Complete registration - verify code and create user
router.post('/register/complete', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    // Validate inputs
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, message: 'Phone number and verification code are required' });
    }
    
    // Verify the code
    const verification = await verifyCode(phoneNumber, code);
    
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    
    // Get pending registration data from database
    const pendingRegistration = await PendingRegistration.findOne({ phoneNumber });
    
    if (!pendingRegistration) {
      return res.status(400).json({ success: false, message: 'Registration session expired or not found' });
    }
    
    // Check if registration session has expired
    if (Date.now() > pendingRegistration.expiresAt) {
      await PendingRegistration.deleteOne({ phoneNumber });
      return res.status(400).json({ success: false, message: 'Registration session expired' });
    }
    
    // Get crypto addresses
    const addresses = await getAvailableCryptoAddresses();
    
    // Create new user
    const newUser = new User({
      username: pendingRegistration.username,
      email: pendingRegistration.email,
      password: pendingRegistration.password,
      phoneNumber: pendingRegistration.phoneNumber,
      isVerified: true,
      walletAddresses: {
        bitcoin: addresses.bitcoin ? addresses.bitcoin.address : null,
        ethereum: addresses.ethereum ? addresses.ethereum.address : null,
        ubt: addresses.ubt ? addresses.ubt.address : null
      },
      balances: {
        btc: 0,
        eth: 0,
        usdt: 0,
        ubt: 100 // Default starting balance
      },
      lastLogin: Date.now()
    });
     await newUser.save();
    
    // Mark crypto addresses as assigned
    if (addresses.bitcoin) {
      await markAddressAsAssigned('bitcoin', addresses.bitcoin.address);
    }
    
    if (addresses.ethereum) {
      await markAddressAsAssigned('ethereum', addresses.ethereum.address);
    }
    
    // Clean up pending registration
    await PendingRegistration.deleteOne({ phoneNumber });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );  
    res.json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        walletAddresses: newUser.walletAddresses,
        isVerified: newUser.isVerified,
        balances: newUser.balances
      }
    });
  } catch (error) {
    console.error('Registration complete error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
export default router;
