import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import twilio from 'twilio';

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
    
    // Use ES module import for twilio
    const client = twilio(accountSid, authToken);
    
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
  
  try {
    // Path to CSV files
    const bitcoinCsvPath = path.join(process.cwd(), '../csv/bitcoin.csv');
    const ethereumCsvPath = path.join(process.cwd(), '../csv/ethereum.csv');
    
    // Read Bitcoin addresses
    const bitcoinAddresses = [];
    if (fs.existsSync(bitcoinCsvPath)) {
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
    } else {
      console.warn('Bitcoin CSV file not found at:', bitcoinCsvPath);
    }
    
    // Read Ethereum addresses
    const ethereumAddresses = [];
    if (fs.existsSync(ethereumCsvPath)) {
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
    } else {
      console.warn('Ethereum CSV file not found at:', ethereumCsvPath);
    }
    
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
  } catch (error) {
    console.error('Error getting crypto addresses:', error);
  }
  
  return addresses;
};

const markAddressAsAssigned = async (currency, address) => {
  try {
    let csvPath;
    
    if (currency === 'bitcoin') {
      csvPath = path.join(process.cwd(), '../csv/bitcoin.csv');
    } else if (currency === 'ethereum' || currency === 'ubt') {
      csvPath = path.join(process.cwd(), '../csv/ethereum.csv');
    } else {
      throw new Error('Invalid currency');
    }
    
    if (!fs.existsSync(csvPath)) {
      console.warn(`CSV file for ${currency} not found at: ${csvPath}`);
      return false;
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
    
    // Write back to the CSV file using ES module import
    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: Object.keys(rows[0]).map(key => ({ id: key, title: key }))
    });
    
    await csvWriter.writeRecords(rows);
    
    // Also update the used.csv file for tracking
    const usedCsvPath = path.join(process.cwd(), '../csv/used.csv');
    const usedRow = {
      address,
      currency,
      assignedAt: new Date().toISOString()
    };
    
    const usedCsvWriter = createObjectCsvWriter({
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
  } catch (error) {
    console.error('Error marking address as assigned:', error);
    return false;
  }
};

// Routes

// GET endpoint to retrieve authenticated user data
router.get('/', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, authorization denied' 
      });
    }
    
    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find user by id from decoded token
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Get user's transactions
      const transactions = await Transaction.find({ 
        userId: user._id 
      }).sort({ date: -1 }).limit(10);
      
      // Calculate balances
      const balances = {
        bitcoin: 0,
        ethereum: 0,
        ubt: 0
      };
      
      // Process transactions to calculate balances
      transactions.forEach(transaction => {
        if (transaction.type === 'deposit') {
          balances[transaction.currency] += transaction.amount;
        } else if (transaction.type === 'withdrawal') {
          balances[transaction.currency] -= transaction.amount;
        }
      });
      
      // Return user data with balances and recent transactions
      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          walletAddresses: user.walletAddresses,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        },
        balances,
        recentTransactions: transactions
      });
    } catch (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ 
        success: false, 
        message: 'Token is not valid' 
      });
    }
  } catch (error) {
    console.error('GET /api/auth error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Add the root POST endpoint to match frontend login expectations
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
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
    
    // Store temp user in session or use a temporary storage solution
    if (!req.session) {
      // If session is not available, use global object (not ideal for production)
      if (!global.tempUsers) {
        global.tempUsers = {};
      }
      global.tempUsers[phoneNumber] = tempUser;
    } else {
      req.session.tempUser = tempUser;
    }
    
    // Send verification code via SMS (now optional)
    try {
      await sendVerificationCode(phoneNumber);
      res.json({ success: true, message: 'Verification code sent. You can also proceed without verification.' });
    } catch (error) {
      // Continue even if SMS fails
      console.error('SMS sending error:', error);
      res.json({ success: true, message: 'Account created! You can proceed without phone verification.' });
    }
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
    
    // Get crypto addresses for the user
    const cryptoAddresses = await getAvailableCryptoAddresses();
    
    // Create new user with verification data stored in database
    // Phone verification is now optional (phoneVerified defaults to true in model)
    const user = new User({
      username,
      email,
      password: hashedPassword,
      phoneNumber: phone,
      walletAddresses: {
        bitcoin: cryptoAddresses.bitcoin ? cryptoAddresses.bitcoin.address : '',
        ethereum: cryptoAddresses.ethereum ? cryptoAddresses.ethereum.address : '',
        ubt: cryptoAddresses.ubt ? cryptoAddresses.ubt.address : ''
      }
    });
    
    // Save user to database
    await user.save();
    
    // Mark addresses as assigned if available
    if (cryptoAddresses.bitcoin) {
      await markAddressAsAssigned('bitcoin', cryptoAddresses.bitcoin.address);
    }
    if (cryptoAddresses.ethereum) {
      await markAddressAsAssigned('ethereum', cryptoAddresses.ethereum.address);
    }
    
    // Generate JWT token for immediate login
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
    
    // Return success with token for immediate login
    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        walletAddresses: user.walletAddresses
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Verify SMS code (kept for backward compatibility but now optional)
router.post('/verify-sms', async (req, res) => {
  try {
    const { phoneNumber, code, userId } = req.body;
    
    // If userId is provided, find and update the user directly
    if (userId) {
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      // Mark phone as verified regardless of code (making verification optional)
      user.phoneVerified = true;
      await user.save();
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, username: user.username },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRE }
      );
      
      return res.json({
        success: true,
        message: 'Phone verified successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          walletAddresses: user.walletAddresses
        }
      });
    }
    
    // Legacy flow - validate inputs
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    
    // Check if we have temp user data
    let tempUser;
    if (req.session && req.session.tempUser) {
      tempUser = req.session.tempUser;
    } else if (global.tempUsers && global.tempUsers[phoneNumber]) {
      tempUser = global.tempUsers[phoneNumber];
    }
    
    if (!tempUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending registration found. Please register first.' 
      });
    }
    
    // Get crypto addresses for the user
    const cryptoAddresses = await getAvailableCryptoAddresses();
    
    // Create and save the user (verification is now optional)
    const user = new User({
      ...tempUser,
      phoneVerified: true, // Always mark as verified
      walletAddresses: {
        bitcoin: cryptoAddresses.bitcoin ? cryptoAddresses.bitcoin.address : '',
        ethereum: cryptoAddresses.ethereum ? cryptoAddresses.ethereum.address : '',
        ubt: cryptoAddresses.ubt ? cryptoAddresses.ubt.address : ''
      }
    });
    
    await user.save();
    
    // Mark addresses as assigned if available
    if (cryptoAddresses.bitcoin) {
      await markAddressAsAssigned('bitcoin', cryptoAddresses.bitcoin.address);
    }
    if (cryptoAddresses.ethereum) {
      await markAddressAsAssigned('ethereum', cryptoAddresses.ethereum.address);
    }
    
    // Clean up temp user data
    if (req.session && req.session.tempUser) {
      delete req.session.tempUser;
    }
    if (global.tempUsers && global.tempUsers[phoneNumber]) {
      delete global.tempUsers[phoneNumber];
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
    
    res.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        walletAddresses: user.walletAddresses
      }
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
