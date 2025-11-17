import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Models
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import VerificationCode from '../models/VerificationCode.js';
import PendingRegistration from '../models/PendingRegistration.js';

// Services
import addressAssignmentService from '../services/addressAssignmentService.js';
import AddressService from '../services/AddressService.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'hsit_jwt_secret_key_2025';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';
const UBT_INITIAL_EXCHANGE_RATE = process.env.UBT_INITIAL_EXCHANGE_RATE || 1;

// Helper functions
const sendVerificationCode = async (email) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await VerificationCode.deleteMany({ email });

    const verificationCode = new VerificationCode({
      email,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    await verificationCode.save();

    // Send email with verification code
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: 'HSIT - Email Verification Code',
      text: `Your HSIT verification code is: ${code}. This code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #00ff88;">HSIT Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return false;
    }

    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Send verification code error:', error);
    return false;
  }
};

const verifyCode = async (email, code) => {
  try {
    const verificationCode = await VerificationCode.findOne({ email });

    if (!verificationCode) {
      console.log(`Verification code not found for ${email}`);
      return { valid: false, message: 'Verification code not found' };
    }

    if (Date.now() > verificationCode.expiresAt) {
      console.log(`Verification code expired for ${email}`);
      await VerificationCode.deleteOne({ email });
      return { valid: false, message: 'Verification code expired' };
    }

    if (verificationCode.code !== code) {
      console.log(`Invalid verification code for ${email}. Expected ${verificationCode.code}, got ${code}`);
      return { valid: false, message: 'Invalid verification code' };
    }

    await VerificationCode.deleteOne({ email });
    console.log(`Verification code verified and deleted for ${email}`);
    return { valid: true };
  } catch (error) {
    console.error('Verify code error:', error);
    return { valid: false, message: 'Server error during code verification' };
  }
};

// GET endpoint to retrieve authenticated user data
router.get('/', async (req, res) => {
  console.log("GET /api/auth - Attempting to retrieve authenticated user data.");
  try {
    const token = req.header('x-auth-token');

    if (!token) {
      console.error("GET /api/auth - No token provided.");
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        console.error(`GET /api/auth - User not found for decoded ID: ${decoded.id}`);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      console.log(`GET /api/auth - User found: ${user.email}`);

      // Ensure balances object exists and convert Decimal128 values to numbers
      const rawBalances = user.balances || {};
      const balancesToSend = {
          bitcoin: rawBalances.bitcoin ? parseFloat(rawBalances.bitcoin.toString()) : 0,
          ethereum: rawBalances.ethereum ? parseFloat(rawBalances.ethereum.toString()) : 0,
          usdt: rawBalances.usdt ? parseFloat(rawBalances.usdt.toString()) : 0,
          ubt: rawBalances.ubt ? parseFloat(rawBalances.ubt.toString()) : 0
      };

      console.log(`GET /api/auth - Returning stored balances for user: ${user.email}`, balancesToSend);

      const recentTransactions = await Transaction.find({ userId: user._id }).sort({ date: -1 }).limit(10);

      // Return user data with the corrected balances and recent transactions
      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          walletAddresses: user.walletAddresses,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        },
        balances: balancesToSend, // Use the converted balances
        recentTransactions: recentTransactions
      });

    } catch (err) {
      console.error('GET /api/auth - Token verification error:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    console.error('GET /api/auth - Unexpected error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// =================================================================
// Login route - authenticate user
// =================================================================
router.post('/', async (req, res) => {
  console.log("POST /api/auth - Login attempt started.");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.error("POST /api/auth - Login failed: Email or password not provided.");
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    const normalizedEmail = String(email).toLowerCase();
    const user = await User.findOne({ email: { $regex: new RegExp('^' + normalizedEmail + '$', 'i') } });

    if (!user) {
      console.error(`POST /api/auth - Login failed: User not found for email: ${normalizedEmail}`);
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.error(`POST /api/auth - Login failed: Incorrect password for user: ${user.email}`);
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }
    
    console.log(`POST /api/auth - Password validation successful for user: ${user.email}.`);

    user.lastLogin = Date.now();
    await user.save();
    console.log(`POST /api/auth - Last login updated for user: ${user.email}`);

    const tokenPayload = { id: user._id, username: user.username };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    console.log(`POST /api/auth - JWT token generated for user: ${user.email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletAddresses: user.walletAddresses,
        isVerified: user.isVerified,
        balances: user.balances
      }
    });
    console.log(`POST /api/auth - Login successful. Response sent for user: ${user.email}`);

  } catch (error) {
    console.error('POST /api/auth - An unexpected error occurred during login:', error);
    res.status(500).json({ success: false, message: 'Server error during login process' });
  }
});


// Direct registration route with auto-address assignment
router.post('/register', async (req, res) => {
  console.log("POST /api/auth/register - Direct registration attempt started.");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));
  try {
    const { username, email, password, referralCode } = req.body;
    if (!username || !email || !password) {
        console.error("POST /api/auth/register - Missing required fields.");
        return res.status(400).json({ success: false, message: 'Username, email, and password are required' });
    }
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        let message = 'User already exists.';
        if (existingUser.email === email) message = 'Email already in use.';
        else if (existingUser.username === username) message = 'Username already taken.';
        console.error(`POST /api/auth/register - Registration failed: ${message}`);
        return res.status(400).json({ success: false, message });
    }

    // Handle referral code if provided
    let invitedBy = null;
    if (referralCode) {
      const inviter = await User.findOne({ invitationCode: referralCode });
      if (inviter) {
        invitedBy = inviter._id;
        console.log(`POST /api/auth/register - User referred by: ${inviter.username}`);
      } else {
        console.log(`POST /api/auth/register - Invalid referral code provided: ${referralCode}`);
      }
    }

    const user = new User({
      username,
      email,
      password,
      invitedBy,
      isVerified: false
    });
    
    await user.save();
    console.log(`POST /api/auth/register - User created successfully: ${user.email} (ID: ${user._id})`);

    addressAssignmentService.assignAddressesToUser(user._id)
      .then(addresses => {
        console.log(`POST /api/auth/register - Assigned addresses to new user ${user._id}:`, addresses);
      })
      .catch(error => {
        console.error(`POST /api/auth/register - Failed to assign addresses to new user ${user._id}:`, error.message);
      });

    const tokenPayload = { id: user._id, username: user.username };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(201).json({ 
        success: true, 
        token,
        user: userResponse, 
        message: 'User created successfully. Please verify your email.' 
    });
  } catch (error) {
    console.error('POST /api/auth/register - Error during direct registration:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message, errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// Initial registration - send verification code
router.post('/register/initial', async (req, res) => {
  console.log("POST /api/auth/register/initial - Initial registration: sending verification code.");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));
  try {
    const { username, email, password, referralCode } = req.body;

    if (!username || !email || !password) {
      console.error("POST /api/auth/register/initial - Missing required fields.");
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: String(email).toLowerCase() },
        { username }
      ]
    });

    if (existingUser) {
      let message = 'User already exists.';
      if (existingUser.email === String(email).toLowerCase()) message = 'Email already in use';
      else if (existingUser.username === username) message = 'Username already taken';
      console.error(`POST /api/auth/register/initial - Registration failed: ${message}`);
      return res.status(400).json({ success: false, message });
    }
    
    const existingPending = await PendingRegistration.findOne({ email: String(email).toLowerCase() });
    if (existingPending) {
        console.log(`POST /api/auth/register/initial - Existing pending registration found for ${email}. It will be overwritten.`);
        await PendingRegistration.deleteMany({ email: String(email).toLowerCase() });
    }

    const emailSent = await sendVerificationCode(String(email).toLowerCase());

    if (!emailSent) {
      console.error(`POST /api/auth/register/initial - Failed to send verification code to ${email}.`);
      return res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
    console.log(`POST /api/auth/register/initial - Email sent to ${email}.`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const pendingRegistration = new PendingRegistration({
      username,
      email: String(email).toLowerCase(),
      password: hashedPassword,
      referralCode: referralCode || null,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    });

    await pendingRegistration.save();
    console.log(`POST /api/auth/register/initial - Pending registration saved for ${email}.`);

    res.json({
      success: true,
      message: 'Verification code sent. Please check your email.',
      email: String(email).toLowerCase()
    });
  } catch (error) {
    console.error('POST /api/auth/register/initial - Error during initial registration:', error);
    res.status(500).json({ success: false, message: 'Server error during initial registration' });
  }
});

// Complete registration - verify code and create user
router.post('/register/complete', async (req, res) => {
  console.log("POST /api/auth/register/complete - Completing registration with verification code.");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      console.error("POST /api/auth/register/complete - Missing email or code.");
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }

    const verification = await verifyCode(String(email).toLowerCase(), code);

    if (!verification.valid) {
      console.error(`POST /api/auth/register/complete - Code verification failed for ${email}: ${verification.message}`);
      return res.status(400).json({ success: false, message: verification.message });
    }
    console.log(`POST /api/auth/register/complete - Code verified for ${email}.`);

    const pendingRegistration = await PendingRegistration.findOne({ email: String(email).toLowerCase() });

    if (!pendingRegistration) {
      console.error(`POST /api/auth/register/complete - Pending registration not found for ${email}.`);
      return res.status(400).json({ success: false, message: 'Registration session expired or not found. Please start over.' });
    }

    if (Date.now() > pendingRegistration.expiresAt) {
      console.error(`POST /api/auth/register/complete - Pending registration session expired for ${email}.`);
      await PendingRegistration.deleteOne({ email: String(email).toLowerCase() });
      return res.status(400).json({ success: false, message: 'Registration session expired. Please start over.' });
    }

    // Handle referral code
    let invitedBy = null;
    if (pendingRegistration.referralCode) {
      const inviter = await User.findOne({ invitationCode: pendingRegistration.referralCode });
      if (inviter) {
        invitedBy = inviter._id;
        console.log(`POST /api/auth/register/complete - User referred by: ${inviter.username}`);
      }
    }

    const newUser = new User({
      username: pendingRegistration.username,
      email: pendingRegistration.email,
      password: pendingRegistration.password,
      invitedBy,
      isVerified: true,
      balances: {
        btc: 0,
        eth: 0,
        usdt: 0,
        ubt: 100
      },
      walletAddresses: {
        btc: '',
        eth: '',
        usdt: ''
      }
    });

    await newUser.save();
    console.log(`POST /api/auth/register/complete - User created: ${newUser.email} (ID: ${newUser._id})`);

    // Assign addresses
    addressAssignmentService.assignAddressesToUser(newUser._id)
      .then(addresses => {
        console.log(`POST /api/auth/register/complete - Assigned addresses to new user ${newUser._id}:`, addresses);
      })
      .catch(error => {
        console.error(`POST /api/auth/register/complete - Failed to assign addresses to new user ${newUser._id}:`, error.message);
      });

    await PendingRegistration.deleteOne({ email: String(email).toLowerCase() });
    console.log(`POST /api/auth/register/complete - Pending registration deleted for ${email}.`);

    const tokenPayload = { id: newUser._id, username: newUser.username };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRE });

    const userResponse = { ...newUser.toObject() };
    delete userResponse.password;

    res.status(201).json({
      success: true,
      token,
      user: userResponse,
      message: 'Registration completed successfully'
    });

  } catch (error) {
    console.error('POST /api/auth/register/complete - Error during registration completion:', error);
    res.status(500).json({ success: false, message: 'Server error during registration completion' });
  }
});

// Resend verification code
router.post('/register/resend', async (req, res) => {
  console.log("POST /api/auth/register/resend - Resending verification code.");
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const pendingRegistration = await PendingRegistration.findOne({ email: String(email).toLowerCase() });

    if (!pendingRegistration) {
      return res.status(400).json({ success: false, message: 'No pending registration found for this email' });
    }

    const emailSent = await sendVerificationCode(String(email).toLowerCase());

    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }

    res.json({
      success: true,
      message: 'Verification code resent successfully'
    });

  } catch (error) {
    console.error('POST /api/auth/register/resend - Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
