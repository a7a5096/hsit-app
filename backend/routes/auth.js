import express from 'express';
import bcrypt from 'bcryptjs';
import * as jose from 'jose'; // Changed import for jose
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js'; // Import User model directly

dotenv.config();

const router = express.Router();

// JWT Secret for token signing - must be a Uint8Array for jose
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'hsit-secret-key';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

// @route   POST api/auth
// @desc    Login user & get token
// @access  Public
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Enhanced logging for debugging
    console.log(`Login attempt for email: ${email}`);
    
    // Basic validation
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Check for existing user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: User with email ${email} not found`);
      return res.status(400).json({ msg: 'User does not exist' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Login failed: Invalid password for ${email}`);
      return res.status(400).json({ msg: 'Invalid credentials' });
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

    // Create token payload
    const payload = {
      user: {
        id: user.id
      }
    };

    // Sign token using jose
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRE)
      .sign(JWT_SECRET);

    console.log(`Login successful for user: ${user.id}`);
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: user.isPhoneVerified,
        balances: user.balances
      }
    });

  } catch (err) {
    console.error('Login error details:', err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/auth
// @desc    Get user data (Protected Route - example)
// @access  Private
router.get('/', async (req, res) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    const user = await User.findById(payload.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
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
    
    res.json(user);
  } catch (err) {
    console.error('Token verification failed:', err);
    if (err.code === 'ERR_JWT_EXPIRED') {
        return res.status(401).json({ msg: 'Token is expired' });
    } else if (err.code === 'ERR_JWS_INVALID' || err.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        return res.status(401).json({ msg: 'Token is not valid' });
    }
    res.status(500).send('Server Error');
  }
});


// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { username, email, password, phone, invitationCode } = req.body; 

  try {
    console.log(`Registration attempt for email: ${email}, username: ${username}`);
    
    // Check for existing user
    let user = await User.findOne({ email });
    if (user) {
      console.log(`Registration failed: Email ${email} already exists`);
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = await User.findOne({ username });
    if (user) {
      console.log(`Registration failed: Username ${username} already taken`);
      return res.status(400).json({ msg: 'Username already taken' });
    }

    // Create new user object with all required fields
    const newUserFields = {
      username,
      email,
      password,
      phoneNumber: phone || '', // Ensure phoneNumber is never undefined
      phoneVerificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
      balances: {
        btc: 0,
        eth: 0,
        usdt: 0,
        ubt: 100 // Default starting balance
      }
    };

    // Only add invitationCode to the fields if it's provided and not an empty string
    if (invitationCode && invitationCode.trim() !== '') {
      newUserFields.invitationCode = invitationCode.trim();
    }

    user = new User(newUserFields);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();
    console.log(`Registration successful for user: ${user.id}`);

    // Create token payload
    const payload = {
      user: {
        id: user.id
      }
    };

    // Sign token using jose
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRE)
      .sign(JWT_SECRET);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phoneVerificationCode: user.phoneVerificationCode,
        balances: user.balances
      }
    });

  } catch (err) {
    console.error('Registration Error details:', err);
    if (err.code === 11000) { 
        return res.status(400).json({ msg: 'Duplicate key error. This might be due to the invitation code, username, or email already being in use.' });
    }
    res.status(500).send('Server Error');
  }
});

export default router;
