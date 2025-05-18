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
    
    // Store the code in memory (in production, use Redis or similar)
    // This is a simplified version for demonstration
    if (!global.verificationCodes) {
      global.verificationCodes = {};
    }
    
    global.verificationCodes[phoneNumber] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    
    // Send SMS
    await client.messages.create({
      body: `Your HSIT verification code is: ${code}`,
      from: twilioPhone,
      to: phoneNumber
    });
    
    return true;
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
};

const verifyCode = (phoneNumber, code) => {
  // Check if we have a verification code for this phone number
  if (!global.verificationCodes || !global.verificationCodes[phoneNumber]) {
    return { valid: false, message: 'No verification code found' };
  }
  
  const verification = global.verificationCodes[phoneNumber];
  
  // Check if code has expired
  if (Date.now() > verification.expiresAt) {
    delete global.verificationCodes[phoneNumber];
    return { valid: false, message: 'Verification code has expired' };
  }
  
  // Check if code matches
  if (verification.code !== code) {
    return { valid: false, message: 'Invalid verification code' };
  }
  
  // Code is valid, clean up
  delete global.verificationCodes[phoneNumber];
  
  return { valid: true };
};

const getAvailableCryptoAddresses = async () => {
  const addresses = {
    bitcoin: null,
    ethereum: null,
    ubt: null
  };
  
  // Path to CSV files
  const bitcoinCsvPath = path.join(process.cwd(), '../frontend/public/csv/bitcoin.csv');
  const ethereumCsvPath = path.join(process.cwd(), '../frontend/public/csv/ethereum.csv');
  
  // Read Bitcoin addresses
  const bitcoinAddresses = [];
  await new Promise((resolve) => {
    fs.createReadStream(bitcoinCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        if (row.used === 'false' || row.used === '0') {
          bitcoinAddresses.push({
            address: row.address,
            privateKey: row.privateKey
          });
        }
      })
      .on('end', resolve);
  });
  
  // Read Ethereum addresses
  const ethereumAddresses = [];
  await new Promise((resolve) => {
    fs.createReadStream(ethereumCsvPath)
      .pipe(csv())
      .on('data', (row) => {
        if (row.used === 'false' || row.used === '0') {
          ethereumAddresses.push({
            address: row.address,
            privateKey: row.privateKey
          });
        }
      })
      .on('end', resolve);
  });
  
  // Assign addresses if available
  if (bitcoinAddresses.length > 0) {
    addresses.bitcoin = bitcoinAddresses[0];
  }
  
  if (ethereumAddresses.length > 0) {
    addresses.ethereum = ethereumAddresses[0];
  }
  
  // For UBT, we'll use the Ethereum address as well
  if (addresses.ethereum) {
    addresses.ubt = {
      address: addresses.ethereum.address,
      privateKey: addresses.ethereum.privateKey
    };
  }
  
  return addresses;
};

const markAddressAsAssigned = async (currency, address) => {
  let csvPath;
  
  if (currency === 'bitcoin') {
    csvPath = path.join(process.cwd(), '../frontend/public/csv/bitcoin.csv');
  } else if (currency === 'ethereum' || currency === 'ubt') {
    csvPath = path.join(process.cwd(), '../frontend/public/csv/ethereum.csv');
  } else {
    throw new Error('Invalid currency');
  }
  
  // Read the CSV file
  const rows = [];
  await new Promise((resolve) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', resolve);
  });
  
  // Update the row with the matching address
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].address === address) {
      rows[i].used = 'true';
      break;
    }
  }
  
  // Write back to the CSV file
  const csvWriter = require('csv-writer').createObjectCsvWriter({
    path: csvPath,
    header: Object.keys(rows[0]).map(key => ({ id: key, title: key }))
  });
  
  await csvWriter.writeRecords(rows);
  
  // Also update the used.csv file for tracking
  const usedCsvPath = path.join(process.cwd(), '../frontend/public/csv/used.csv');
  const usedRow = {
    address,
    currency,
    assignedAt: new Date().toISOString()
  };
  
  const usedCsvWriter = require('csv-writer').createObjectCsvWriter({
    path: usedCsvPath,
    header: [
      { id: 'address', title: 'address' },
      { id: 'currency', title: 'currency' },
      { id: 'assignedAt', title: 'assignedAt' }
    ],
    append: true
  });
  
  await usedCsvWriter.writeRecords([usedRow]);
  
  return true;
};

// Routes

// Initial registration - collect user info and send verification code
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
        { username },
        { email },
        { phoneNumber }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username, email, or phone number already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user document but don't save yet (wait for verification)
    const tempUser = {
      username,
      email,
      password: hashedPassword,
      phoneNumber
    };
    
    // Store temp user in session
    req.session.tempUser = tempUser;
    
    // Send verification code via SMS
    const smsSent = await sendVerificationCode(phoneNumber);
    
    if (!smsSent) {
      return res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
    
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add the missing /register endpoint to match frontend expectations
router.post('/register', async (req, res) => {
  try {
    const { username, email, phone, password, invitationCode } = req.body;
    
    // Validate inputs
    if (!username || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username },
        { email },
        { phoneNumber: phone }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username, email, or phone number already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = Date.now() + 3600000; // 1 hour
    
    // Create new user with verification data stored in database
    const user = new User({
      username,
      email,
      password: hashedPassword,
      phoneNumber: phone,
      phoneVerified: false,
      phoneVerificationCode: verificationCode,
      phoneVerificationExpires: verificationExpires
    });
    
    // Save user to database
    await user.save();
    
    // Send verification code via Twilio
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
      
      const client = require('twilio')(accountSid, authToken);
      
      await client.messages.create({
        body: `Your HSIT verification code is: ${verificationCode}`,
        from: twilioPhone,
        to: phone
      });
    } catch (twilioErr) {
      console.error('Twilio error:', twilioErr);
      // Continue with registration even if SMS fails
      // User can request code resend later
    }
    
    // Return success with userId for verification redirect
    return res.status(201).json({
      message: 'Account created! Please verify your phone number.',
      userId: user._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Verify SMS code
router.post('/verify-sms', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    // Validate inputs
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, message: 'Phone number and code are required' });
    }
    
    // Check if we have temp user data
    if (!req.session.tempUser || req.session.tempUser.phoneNumber !== phoneNumber) {
      return res.status(400).json({ success: false, message: 'Session expired, please start registration again' });
    }
    
    // Verify the code
    const verification = verifyCode(phoneNumber, code);
    
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    
    // Get crypto addresses for the user
    const cryptoAddresses = await getAvailableCryptoAddresses();
    
    // Ensure we have all required addresses
    if (!cryptoAddresses.bitcoin || !cryptoAddresses.ethereum || !cryptoAddresses.ubt) {
      return res.status(500).json({ success: false, message: 'Unable to allocate crypto addresses' });
    }
    
    // Create and save the user
    const user = new User({
      ...req.session.tempUser,
      phoneVerified: true,
      walletAddresses: {
        bitcoin: cryptoAddresses.bitcoin.address,
        ethereum: cryptoAddresses.ethereum.address,
        ubt: cryptoAddresses.ubt.address
      }
    });
    
    await user.save();
    
    // Mark addresses as assigned
    await markAddressAsAssigned('bitcoin', cryptoAddresses.bitcoin.address);
    await markAddressAsAssigned('ethereum', cryptoAddresses.ethereum.address);
    
    // Clear temp user data
    delete req.session.tempUser;
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
    
    res.json({
      success: true,
      userId: user._id,
      token,
      addresses: [
        cryptoAddresses.bitcoin.address,
        cryptoAddresses.ethereum.address,
        cryptoAddresses.ubt.address
      ]
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Check if we have temp user data
    if (!req.session.tempUser || req.session.tempUser.phoneNumber !== phoneNumber) {
      return res.status(400).json({ success: false, message: 'Session expired, please start registration again' });
    }
    
    // Send verification code via SMS
    const smsSent = await sendVerificationCode(phoneNumber);
    
    if (!smsSent) {
      return res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
    
    res.json({ success: true, message: 'Verification code resent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate inputs
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }
    
    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username },
        { email: username }
      ]
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
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
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        walletAddresses: user.walletAddresses,
        cryptoBalance: user.cryptoBalance
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
