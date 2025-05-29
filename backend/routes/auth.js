import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';

// Models
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import VerificationCode from '../models/VerificationCode.js';
import PendingRegistration from '../models/PendingRegistration.js';

// Services
import addressAssignmentService from '../services/addressAssignmentService.js';
import AddressService from '../services/AddressService.js';

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

// Login route - authenticate user
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Normalize email to lowercase for case-insensitive lookup
    const normalizedEmail = email.toLowerCase();
    
    // Find user by normalized email (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp('^' + normalizedEmail + '$', 'i') } 
    });
    
    // Check if user exists
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email or password' 
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
      message: 'Server error' 
    });
  }
});

// Direct registration route with auto-address assignment
router.post('/register', async (req, res) => {
  try {
    // Your existing user creation logic
    const user = new User(req.body);
    await user.save();
    
    // Auto-assign addresses using addressAssignmentService
    addressAssignmentService.assignAddressesToUser(user._id)
      .then(addresses => {
        console.log(`Assigned addresses to new user ${user._id}:`, addresses);
      })
      .catch(error => {
        console.error(`Failed to assign addresses to new user ${user._id}:`, error.message);
      });
    res.json({ success: true, user, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    
    // Create new user
    const newUser = new User({
      username: pendingRegistration.username,
      email: pendingRegistration.email,
      password: pendingRegistration.password,
      phoneNumber: pendingRegistration.phoneNumber,
      isVerified: true,
      balances: {
        btc: 0,
        eth: 0,
        usdt: 0,
        ubt: 100 // Default starting balance
      },
      lastLogin: Date.now()
    });
    
    await newUser.save();
    
    // Assign crypto addresses to user using addressAssignmentService
    try {
      const addresses = await addressAssignmentService.assignAddressesToUser(newUser._id);
      
      // Update user with wallet addresses
      if (addresses) {
        newUser.walletAddresses = {
          bitcoin: addresses.BTC,
          ethereum: addresses.ETH,
          ubt: addresses.USDT
        };
        
        await newUser.save();
      }
    } catch (error) {
      console.error('Error assigning addresses:', error);
      // Continue registration even if address assignment fails
    }
    
    // Delete pending registration
    await PendingRegistration.deleteOne({ phoneNumber });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        phoneNumber: newUser.phoneNumber,
        walletAddresses: newUser.walletAddresses,
        isVerified: newUser.isVerified
      }
    });
  } catch (error) {
    console.error('Registration completion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify phone number for existing user
router.post('/verify-phone', async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Verify code
    const verification = await verifyCode(user.phoneNumber, code);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    
    // Update user verification status
    user.isVerified = true;
    await user.save();
    
    res.json({
      success: true,
      message: 'Phone number verified successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send verification code to phone number
router.post('/send-verification', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    
    // Send verification code
    const sent = await sendVerificationCode(phoneNumber);
    
    if (sent) {
      res.json({ success: true, message: 'Verification code sent' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
