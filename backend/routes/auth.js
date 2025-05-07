import express from 'express';
import bcrypt from 'bcryptjs';
import * as jose from 'jose'; // Changed import for jose
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// JWT Secret for token signing - must be a Uint8Array for jose
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'hsit-secret-key';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
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
  invitationCode: { // Added invitationCode to the schema
    type: String,
    // unique: true, // This unique constraint is causing issues with nulls
    // sparse: true, // Consider sparse index if uniqueness is needed for non-null values
    default: null
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
        isVerified: user.isPhoneVerified,
        balances: user.balances
      }
    });

  } catch (err) {
    console.error(err.message);
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
    
    res.json(user);
  } catch (err) {
    console.error('Token verification failed:', err.message);
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
  const { username, email, password, phoneNumber, invitationCode } = req.body; // Added invitationCode

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

    // Create new user object
    const newUserFields = {
      username,
      email,
      password,
      phoneNumber,
      // Generate random verification code
      phoneVerificationCode: Math.floor(100000 + Math.random() * 900000).toString()
    };

    // Only add invitationCode if it's provided and not null/empty
    if (invitationCode && invitationCode.trim() !== '') {
      newUserFields.invitationCode = invitationCode.trim();
    } else {
      // If no invitation code, explicitly set to undefined or don't set it
      // Mongoose will use the schema default (null) if not set, 
      // but we want to avoid setting it to null if the index causes issues.
      // By not setting it, if the schema default is null, it will be null.
      // The issue is the unique index on null values.
      // The best fix is to adjust the index in MongoDB to be sparse or remove uniqueness on nulls.
      // For now, we will not set the field if it's empty to avoid the direct error.
      // This relies on the schema default or Mongoose behavior for unset fields.
    }

    user = new User(newUserFields);

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
        phoneVerificationCode: user.phoneVerificationCode // Normally you'd send this via SMS
      }
    });

  } catch (err) {
    console.error('Registration Error:', err.message);
    if (err.code === 11000) { // Handle duplicate key error specifically
        return res.status(400).json({ msg: 'Duplicate key error. This might be due to the invitation code or another unique field.' });
    }
    res.status(500).send('Server Error');
  }
});

export default router;

