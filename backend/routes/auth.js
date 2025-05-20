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

// Import migration utility
import { migrateCryptoAddressesFromCsv } from '../utils/cryptoMigration.js';

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
    console.error('SMS sending error:', error);
    return false;
  }
};

const verifyCode = async (phoneNumber, code) => {
  try {
    // Find verification code in database
    const verification = await VerificationCode.findOne({ phoneNumber });
    
    // Check if we have a verification code for this phone number
    if (!verification) {
      return { valid: false, message: 'No verification code found' };
    }
    
    // Check if code has expired
    if (Date.now() > verification.expiresAt) {
      await VerificationCode.deleteOne({ phoneNumber });
      return { valid: false, message: 'Verification code has expired' };
    }
    
    // Check if code matches
    if (verification.code !== code) {
      return { valid: false, message: 'Invalid verification code' };
    }
    
    // Code is valid, clean up
    await VerificationCode.deleteOne({ phoneNumber });
    
    return { valid: true };
  } catch (error) {
    console.error('Verification error:', error);
    return { valid: false, message: 'Server error during verification' };
  }
};

// Import crypto address model
import CryptoAddress from '../models/CryptoAddress.js';

const getAvailableCryptoAddresses = async () => {
  const addresses = {
    bitcoin: null,
    ethereum: null,
    ubt: null
  };
  
  try {
    // Find available Bitcoin address
    const bitcoinAddress = await CryptoAddress.findOne({ 
      currency: 'bitcoin', 
      used: false 
    });
    
    if (bitcoinAddress) {
      addresses.bitcoin = {
        address: bitcoinAddress.address,
        privateKey: bitcoinAddress.privateKey
      };
    }
    
    // Find available Ethereum address
    const ethereumAddress = await CryptoAddress.findOne({ 
      currency: 'ethereum', 
      used: false 
    });
    
    if (ethereumAddress) {
      addresses.ethereum = {
        address: ethereumAddress.address,
        privateKey: ethereumAddress.privateKey
      };
      
      // For UBT, we'll use the Ethereum address as well
      addresses.ubt = {
        address: ethereumAddress.address,
        privateKey: ethereumAddress.privateKey
      };
    }
    
    // If we don't have addresses in the database yet, try to migrate from CSV files
    if (!addresses.bitcoin || !addresses.ethereum) {
      await migrateCryptoAddressesFromCsv();
      
      // Try again after migration
      if (!addresses.bitcoin) {
        const bitcoinAddress = await CryptoAddress.findOne({ 
          currency: 'bitcoin', 
          used: false 
        });
        
        if (bitcoinAddress) {
          addresses.bitcoin = {
            address: bitcoinAddress.address,
            privateKey: bitcoinAddress.privateKey
          };
        }
      }
      
      if (!addresses.ethereum) {
        const ethereumAddress = await CryptoAddress.findOne({ 
          currency: 'ethereum', 
          used: false 
        });
        
        if (ethereumAddress) {
          addresses.ethereum = {
            address: ethereumAddress.address,
            privateKey: ethereumAddress.privateKey
          };
          
          // For UBT, we'll use the Ethereum address as well
          addresses.ubt = {
            address: ethereumAddress.address,
            privateKey: ethereumAddress.privateKey
          };
        }
      }
    }
  } catch (error) {
    console.error('Error getting crypto addresses:', error);
  }
  
  return addresses;
};

const markAddressAsAssigned = async (currency, address) => {
  try {
    // Find the address in the database
    const cryptoAddress = await CryptoAddress.findOne({ address });
    
    if (!cryptoAddress) {
      console.warn(`Crypto address ${address} not found in database`);
      return false;
    }
    
    // Mark as used and save
    cryptoAddress.used = true;
    cryptoAddress.assignedAt = new Date();
    await cryptoAddress.save();
    
    console.log(`Marked ${currency} address ${address} as assigned in database`);
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
