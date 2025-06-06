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

    if (!accountSid || !authToken || !twilioPhone) {
        console.error('Twilio credentials are not fully configured. Please check environment variables.');
        return false;
    }

    const client = twilio(accountSid, authToken);

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await VerificationCode.deleteMany({ phoneNumber });

    const verificationCode = new VerificationCode({
      phoneNumber,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    await verificationCode.save();

    await client.messages.create({
      body: `Your HSIT verification code is: ${code}`,
      from: twilioPhone,
      to: phoneNumber
    });
    console.log(`Verification SMS sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Send verification code error:', error);
    return false;
  }
};

const verifyCode = async (phoneNumber, code) => {
  try {
    const verificationCode = await VerificationCode.findOne({ phoneNumber });

    if (!verificationCode) {
      console.log(`Verification code not found for ${phoneNumber}`);
      return { valid: false, message: 'Verification code not found' };
    }

    if (Date.now() > verificationCode.expiresAt) {
      console.log(`Verification code expired for ${phoneNumber}`);
      await VerificationCode.deleteOne({ phoneNumber });
      return { valid: false, message: 'Verification code expired' };
    }

    if (verificationCode.code !== code) {
      console.log(`Invalid verification code for ${phoneNumber}. Expected ${verificationCode.code}, got ${code}`);
      return { valid: false, message: 'Invalid verification code' };
    }

    await VerificationCode.deleteOne({ phoneNumber });
    console.log(`Verification code verified and deleted for ${phoneNumber}`);
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
      console.log("GET /api/auth - No token provided.");
      return res.status(401).json({
        success: false,
        message: 'No authentication token, authorization denied'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("GET /api/auth - Token decoded:", decoded);

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        console.log(`GET /api/auth - User not found for ID: ${decoded.id}`);
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
          phoneNumber: user.phoneNumber,
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
        phoneNumber: user.phoneNumber,
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
    const { username, email, password, phoneNumber } = req.body;
    if (!username || !email || !password || !phoneNumber) {
        console.error("POST /api/auth/register - Missing required fields.");
        return res.status(400).json({ success: false, message: 'All fields (username, email, password, phoneNumber) are required' });
    }
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }, { phoneNumber }] });
    if (existingUser) {
        let message = 'User already exists.';
        if (existingUser.email === email) message = 'Email already in use.';
        else if (existingUser.username === username) message = 'Username already taken.';
        else if (existingUser.phoneNumber === phoneNumber) message = 'Phone number already registered.';
        console.error(`POST /api/auth/register - Registration failed: ${message}`);
        return res.status(400).json({ success: false, message });
    }

    const user = new User(req.body);
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
        message: 'User created successfully' 
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
    const { username, email, password, phoneNumber } = req.body;

    if (!username || !email || !password || !phoneNumber) {
      console.error("POST /api/auth/register/initial - Missing required fields.");
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: String(email).toLowerCase() },
        { username },
        { phoneNumber }
      ]
    });

    if (existingUser) {
      let message = 'User already exists.';
      if (existingUser.email === String(email).toLowerCase()) message = 'Email already in use';
      else if (existingUser.username === username) message = 'Username already taken';
      else if (existingUser.phoneNumber === phoneNumber) message = 'Phone number already registered';
      console.error(`POST /api/auth/register/initial - Registration failed: ${message}`);
      return res.status(400).json({ success: false, message });
    }
    
    const existingPending = await PendingRegistration.findOne({ phoneNumber });
    if (existingPending) {
        console.log(`POST /api/auth/register/initial - Existing pending registration found for ${phoneNumber}. It will be overwritten.`);
        await PendingRegistration.deleteMany({ phoneNumber });
    }

    const smsSent = await sendVerificationCode(phoneNumber);

    if (!smsSent) {
      console.error(`POST /api/auth/register/initial - Failed to send verification code to ${phoneNumber}.`);
      return res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
    console.log(`POST /api/auth/register/initial - SMS sent to ${phoneNumber}.`);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const pendingRegistration = new PendingRegistration({
      username,
      email: String(email).toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    });

    await pendingRegistration.save();
    console.log(`POST /api/auth/register/initial - Pending registration saved for ${phoneNumber}.`);

    res.json({
      success: true,
      message: 'Verification code sent. Please check your phone.',
      phoneNumber
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
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      console.error("POST /api/auth/register/complete - Missing phone number or code.");
      return res.status(400).json({ success: false, message: 'Phone number and verification code are required' });
    }

    const verification = await verifyCode(phoneNumber, code);

    if (!verification.valid) {
      console.error(`POST /api/auth/register/complete - Code verification failed for ${phoneNumber}: ${verification.message}`);
      return res.status(400).json({ success: false, message: verification.message });
    }
    console.log(`POST /api/auth/register/complete - Code verified for ${phoneNumber}.`);

    const pendingRegistration = await PendingRegistration.findOne({ phoneNumber });

    if (!pendingRegistration) {
      console.error(`POST /api/auth/register/complete - Pending registration not found for ${phoneNumber}.`);
      return res.status(400).json({ success: false, message: 'Registration session expired or not found. Please start over.' });
    }

    if (Date.now() > pendingRegistration.expiresAt) {
      console.error(`POST /api/auth/register/complete - Pending registration session expired for ${phoneNumber}.`);
      await PendingRegistration.deleteOne({ phoneNumber });
      return res.status(400).json({ success: false, message: 'Registration session expired. Please start over.' });
    }

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
        ubt: 100
      },
      lastLogin: Date.now()
    });

    await newUser.save();
    console.log(`POST /api/auth/register/complete - New user created: ${newUser.email} (ID: ${newUser._id})`);

    try {
      const addresses = await addressAssignmentService.assignAddressesToUser(newUser._id);
      if (addresses) {
        newUser.walletAddresses = {
          bitcoin: addresses.BTC,
          ethereum: addresses.ETH,
          ubt: addresses.USDT
        };
        await newUser.save();
        console.log(`POST /api/auth/register/complete - Wallet addresses assigned and saved for user ${newUser._id}.`);
      } else {
        console.warn(`POST /api/auth/register/complete - No addresses returned by addressAssignmentService for user ${newUser._id}.`);
      }
    } catch (assignError) {
      console.error(`POST /api/auth/register/complete - Error assigning addresses to user ${newUser._id}:`, assignError);
    }

    await PendingRegistration.deleteOne({ phoneNumber });
    console.log(`POST /api/auth/register/complete - Pending registration deleted for ${phoneNumber}.`);

    const tokenPayload = { id: newUser._id, username: newUser.username };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    console.log(`POST /api/auth/register/complete - JWT token generated for new user: ${newUser.email}`);

    const userResponse = { ...newUser.toObject() };
    delete userResponse.password;


    res.status(201).json({
      success: true,
      token,
      user: userResponse
    });
    console.log(`POST /api/auth/register/complete - Registration complete. Response sent for user: ${newUser.email}`);

  } catch (error) {
    console.error('POST /api/auth/register/complete - Error during registration completion:', error);
    res.status(500).json({ success: false, message: 'Server error during registration completion' });
  }
});

// Verify phone number for existing user
router.post('/verify-phone', async (req, res) => {
  console.log("POST /api/auth/verify-phone - Phone verification attempt.");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
        console.error("POST /api/auth/verify-phone - Missing userId or code.");
        return res.status(400).json({ success: false, message: 'User ID and verification code are required.' });
    }

    const user = await User.findById(userId);

    if (!user) {
      console.error(`POST /api/auth/verify-phone - User not found for ID: ${userId}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.phoneNumber) {
        console.error(`POST /api/auth/verify-phone - User ${userId} does not have a phone number on record.`);
        return res.status(400).json({ success: false, message: 'No phone number on record for this user.' });
    }

    const verification = await verifyCode(user.phoneNumber, code);
    if (!verification.valid) {
      console.error(`POST /api/auth/verify-phone - Code verification failed for user ${userId} (${user.phoneNumber}): ${verification.message}`);
      return res.status(400).json({ success: false, message: verification.message });
    }
    console.log(`POST /api/auth/verify-phone - Code verified for user ${userId} (${user.phoneNumber}).`);

    user.isVerified = true;
    await user.save();
    console.log(`POST /api/auth/verify-phone - User ${userId} verification status updated to true.`);

    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('POST /api/auth/verify-phone - Error during phone verification:', error);
    res.status(500).json({ success: false, message: 'Server error during phone verification' });
  }
});

// Send verification code to a phone number
router.post('/send-verification', async (req, res) => {
  console.log("POST /api/auth/send-verification - Request to send/resend verification code.");
  console.log("Request Body:", JSON.stringify(req.body, null, 2));
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      console.error("POST /api/auth/send-verification - Phone number is required.");
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const sent = await sendVerificationCode(phoneNumber);

    if (sent) {
      console.log(`POST /api/auth/send-verification - Verification code sent successfully to ${phoneNumber}.`);
      res.json({ success: true, message: 'Verification code sent successfully. Please check your phone.' });
    } else {
      console.error(`POST /api/auth/send-verification - Failed to send verification code to ${phoneNumber}.`);
      res.status(500).json({ success: false, message: 'Failed to send verification code. Please try again later.' });
    }
  } catch (error) {
    console.error('POST /api/auth/send-verification - Error sending verification code:', error);
    res.status(500).json({ success: false, message: 'Server error while sending verification code' });
  }
});

export default router;
