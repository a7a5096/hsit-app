// backend/routes/users.js

// Use ES Module import syntax
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { check, validationResult } from 'express-validator';

// Import models - add .js extension for local files in ESM
import User from '../models/User.js';
import InvitationCode from '../models/InvitationCode.js';

const router = express.Router();

// @route   POST api/users
// @desc    Register user (Signup)
// @access  Public (Requires valid Invitation Code)
// --- FIX: Change route path from '/' to '/users' ---
router.post(
  '/users', // <--- FIX: Correct path
  [
    // Input validation rules
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    check('invitationCode', 'Invitation code is required').not().isEmpty(),
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    // Destructure after validation
    const { name, email, password, invitationCode } = req.body;

    try {
      // --- Invitation Code Check ---
      const code = await InvitationCode.findOne({ code: invitationCode });
      if (!code) {
           return res.status(400).json({ message: 'Invalid invitation code' });
      }
      if (code.isUsed) {
           return res.status(400).json({ message: 'Invitation code has already been used' });
      }
      if (code.expiryDate && code.expiryDate < new Date()) {
           return res.status(400).json({ message: 'Invitation code has expired' });
      }

      // --- User Existence Check ---
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // --- Create and Save User ---
      user = new User({ name, email, password });
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save(); // Save the new user document

      // --- Mark Invitation Code Used ---
      code.isUsed = true;
      code.usedBy = user._id;
      await code.save();

      // --- Generate JWT ---
      const payload = {
        user: {
          id: user.id,
        },
      };

      // Ensure JWT_SECRET is defined in your .env / Render environment
      if (!process.env.JWT_SECRET) {
          console.error('FATAL ERROR: JWT_SECRET is not defined.');
          return res.status(500).json({ message: 'Server configuration error.' });
      }

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '5 days' }, // Use env var or default
        (err, token) => {
          if (err) {
              console.error('JWT Sign Error:', err);
              return res.status(500).json({ message: 'Error generating authentication token.' });
          }
          // Success: Return token and user info
          res.status(201).json({ // Send 201 Created status
            token,
            user: { id: user.id, name: user.name, email: user.email },
           });
        }
      );

    } catch (err) {
      console.error('Signup Route Error:', err.message);
      // Handle potential duplicate key errors during save, although unlikely now
      if (err.code === 11000) {
          return res.status(400).json({ message: 'Data conflict, potentially duplicate information.' });
      }
      res.status(500).send('Server error during signup');
    }
  }
);

// Use ES Module export syntax
export default router;
