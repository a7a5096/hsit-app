import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// JWT Secret for token signing
const JWT_SECRET = process.env.JWT_SECRET || 'hsit-secret-key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

// A simple user schema (since we don't have access to your User model)
// Replace this with your actual User model import
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationCode: {
    type: String
  },
  balances: {
    btc: { type: Number, default: 0 },
    eth: { type: Number, default: 0 },
    usdt: { type: Number, default: 0 },
    ubt: { type: Number, default: 100 }  // Start with 100 UBT for testing
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create model if it doesn't exist
let User;
try {
  User = mongoose.model('user');
} catch (error) {
  User = mongoose.model('user', UserSchema);
}

// @route   POST api/auth
// @desc    Login user & get token
// @access  Public
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    // Check for existing user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'User does not exist' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create token payload
    const payload = {
      user: {
        id: user.id
      }
    };

    // Sign token
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE },
      (err, token) => {
        if (err) throw err;
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
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/auth
// @desc    Get user data
// @access  Private
router.get('/', async (req, res) => {
  try {
    // For testing - normally this would check a token
    // In production, use middleware to verify the token and set req.user
    const userId = req.header('x-auth-token');
    
    // For testing, if no token is provided, just return a test user
    if (!userId) {
      return res.json({
        id: '12345',
        username: 'testuser',
        email: 'test@example.com',
        isVerified: true,
        balances: {
          btc: 0.01,
          eth: 0.5,
          usdt: 100,
          ubt: 500
        }
      });
    }
    
    // Find the user (normally by ID from token)
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { username, email, password, phoneNumber } = req.body;

  try {
    // Check for existing user
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'Username already taken' });
    }

    // Create new user
    user = new User({
      username,
      email,
      password,
      phoneNumber,
      // Generate random verification code
      phoneVerificationCode: Math.floor(100000 + Math.random() * 900000).toString()
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // Create token payload
    const payload = {
      user: {
        id: user.id
      }
    };

    // Sign token
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phoneVerificationCode: user.phoneVerificationCode // Normally you'd send this via SMS
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;