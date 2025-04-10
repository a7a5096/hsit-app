const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator'); // Import validator

const User = require('../models/User');
const InvitationCode = require('../models/InvitationCode');

// @route   POST api/users
// @desc    Register user (Signup)
// @access  Public (Requires valid Invitation Code)
router.post(
  '/',
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
      // Return first error message for simplicity
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password, invitationCode } = req.body;

    try {
      // Check Invitation Code first
      const code = await InvitationCode.findOne({ code: invitationCode });

      // Provide more specific error messages for invitation code issues
      if (!code) {
           return res.status(400).json({ message: 'Invalid invitation code' });
      }
      if (code.isUsed) {
           return res.status(400).json({ message: 'Invitation code has already been used' });
      }
      if (code.expiryDate && code.expiryDate < new Date()) {
           return res.status(400).json({ message: 'Invitation code has expired' });
      }

      // See if user exists *after* validating code
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Create new user instance
      user = new User({ name, email, password });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Save user to DB
      await user.save();

      // Mark invitation code as used *after* user is successfully saved
      code.isUsed = true;
      code.usedBy = user._id; // Link the code to the user who used it
      await code.save();

      // Return jsonwebtoken (Payload, Secret, Options)
      const payload = {
        user: {
          id: user.id, // Use user.id (Mongoose virtual)
        },
      };

      // NOTE: Line 95 from the error message is inside this res.json() object below.
      jwt.sign(
        payload,
        process.env.JWT_SECRET, // Ensure JWT_SECRET is set in Render Env Vars
        { expiresIn: '5 days' }, // Token expiry
        (err, token) => { // Callback starts here
          if (err) {
              // Throwing the error here might crash the server on JWT issues.
              // It's often better to log it and send a 500 response.
              console.error('JWT Sign Error:', err);
              return res.status(500).json({ message: 'Error generating authentication token.' });
          };
          // Return token and user info (excluding password) upon successful signup
          res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email },
           }); // Closing bracket for res.json argument
        } // Closing bracket for jwt.sign callback
      ); // Closing parenthesis for jwt.sign

    } catch (err) {
      // This is the general error handler for the try block
      console.error('Signup Route Error:', err.message); // Log the actual error
      // Check if it's a duplicate key error (e.g., email already exists, though checked above)
      if (err.code === 11000) {
          return res.status(400).json({ message: 'Email already exists.' });
      }
      // Send a generic server error message to the client
      res.status(500).send('Server error during signup');
    }
  } // Closing bracket for the main async (req, res) route handler function
); // Closing parenthesis for router.post

module.exports = router; // Ensure this line is the very last line