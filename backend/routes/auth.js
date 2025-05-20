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
    
    // Write back to the CSV file
    const csvWriter = require('csv-writer').createObjectCsvWriter({
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
      
      // Ensure user has balances object with all required fields
      if (!user.balances) {
        console.log(`Fixing missing balances for user: ${user.id}`);
        user.balances = {
          btc: 0,
          eth: 0,
          usdt: 0,
          ubt: 100 // Default starting balance
        };
        await user.save();
      } else {
        // Ensure all balance fields exist
        const requiredBalances = ['btc', 'eth', 'usdt', 'ubt'];
        let balanceUpdated = false;
        
        for (const currency of requiredBalances) {
          if (user.balances[currency] === undefined) {
            console.log(`Adding missing ${currency} balance for user: ${user.id}`);
            user.balances[currency] = currency === 'ubt' ? 100 : 0; // Default UBT to 100, others to 0
            balanceUpdated = true;
          }
        }
        
        if (balanceUpdated) {
          await user.save();
        }
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
          createdAt: user.createdAt,
          balances: user.balances // Include the user's balances from the model
        },
        balances, // Include calculated balances from transactions
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
    
    console.log(`Login attempt for email: ${email}`);
    
    // Validate inputs
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`Login failed: User with email ${email} not found`);
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log(`Login failed: Invalid password for ${email}`);
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Ensure user has balances object with all required fields
    if (!user.balances) {
      console.log(`Fixing missing balances for user: ${user.id}`);
      user.balances = {
        btc: 0,
        eth: 0,
        usdt: 0,
        ubt: 100 // Default starting balance
      };
    } else {
      // Ensure all balance fields exist
      const requiredBalances = ['btc', 'eth', 'usdt', 'ubt'];
      let balanceUpdated = false;
      
      for (const currency of requiredBalances) {
        if (user.balances[currency] === undefined) {
          console.log(`Adding missing ${currency} balance for user: ${user.id}`);
          user.balances[currency] = currency === 'ubt' ? 100 : 0; // Default UBT to 100, others to 0
          balanceUpdated = true;
        }
      }
    }
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save();
    
    console.log(`Login successful for user: ${user.id}`);
    
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
        cryptoBalance: user.cryptoBalance,
        balances: user.balances // Include the user's balances
      }
    });
  } catch (error) {
    console.error('Login error details:', error);
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
        { email },
        { username }
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
    
    // Store user data in session or temporary storage
    // For simplicity, we'll use a global object (in production, use Redis or similar)
    if (!global.pendingRegistrations) {
      global.pendingRegistrations = {};
    }
    
    global.pendingRegistrations[phoneNumber] = {
      username,
      email,
      password: hashedPassword,
      phoneNumber,
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    };
    
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

// Complete registration - verify code and create user
router.post('/register/complete', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    // Validate inputs
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, message: 'Phone number and verification code are required' });
    }
    
    // Verify the code
    const verification = verifyCode(phoneNumber, code);
    
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    
    // Get pending registration data
    if (!global.pendingRegistrations || !global.pendingRegistrations[phoneNumber]) {
      return res.status(400).json({ success: false, message: 'Registration session expired or not found' });
    }
    
    const userData = global.pendingRegistrations[phoneNumber];
    
    // Check if registration session has expired
    if (Date.now() > userData.expiresAt) {
      delete global.pendingRegistrations[phoneNumber];
      return res.status(400).json({ success: false, message: 'Registration session expired' });
    }
    
    // Get crypto addresses
    const addresses = await getAvailableCryptoAddresses();
    
    // Create new user
    const newUser = new User({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      phoneNumber: userData.phoneNumber,
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
    
    // Mark addresses as assigned
    if (addresses.bitcoin) {
      await markAddressAsAssigned('bitcoin', addresses.bitcoin.address);
    }
    
    if (addresses.ethereum) {
      await markAddressAsAssigned('ethereum', addresses.ethereum.address);
    }
    
    // Clean up
    delete global.pendingRegistrations[phoneNumber];
    
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
