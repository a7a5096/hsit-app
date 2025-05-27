import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import twilio from 'twilio';

// Models
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Services
import addressAssignmentService from '../services/addressAssignmentService.js';

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
      console.error('SMS sending error:', error);
      res.json({ success: true, message: 'Could not send verification code. You can proceed without verification.' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Complete registration - verify code and create user
router.post('/register/complete', async (req, res) => {
  try {
    const { phoneNumber, verificationCode, skipVerification } = req.body;
    
    // Get temp user data
    let tempUser;
    if (!req.session) {
      tempUser = global.tempUsers?.[phoneNumber];
    } else {
      tempUser = req.session.tempUser;
    }
    
    if (!tempUser) {
      return res.status(400).json({ success: false, message: 'Registration session expired or invalid' });
    }
    
    // Verify code if not skipping verification
    if (!skipVerification && verificationCode) {
      const verification = verifyCode(phoneNumber, verificationCode);
      if (!verification.valid) {
        return res.status(400).json({ success: false, message: verification.message });
      }
    }
    
    // Create new user
    const newUser = new User({
      username: tempUser.username,
      email: tempUser.email,
      password: tempUser.password,
      phoneNumber: tempUser.phoneNumber,
      isVerified: !skipVerification
    });
    
    // Save user to database
    await newUser.save();
    
    // Assign crypto addresses to user using addressAssignmentService
    try {
      const addresses = await addressAssignmentService.assignAddressesToUser(newUser._id);
      
      // Update user with wallet addresses
      newUser.walletAddresses = {
        bitcoin: addresses.BTC,
        ethereum: addresses.ETH,
        ubt: addresses.USDT
      };
      
      await newUser.save();
    } catch (error) {
      console.error('Error assigning addresses:', error);
      // Continue registration even if address assignment fails
    }
    
    // Clean up temp user data
    if (!req.session) {
      delete global.tempUsers[phoneNumber];
    } else {
      delete req.session.tempUser;
    }
    
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
    const { userId, verificationCode } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Verify code
    const verification = verifyCode(user.phoneNumber, verificationCode);
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
