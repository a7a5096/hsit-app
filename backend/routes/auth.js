import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';
import PendingRegistration from '../models/PendingRegistration.js';
import { sendVerificationEmail, sendEmail } from '../utils/emailService.js';
// Correctly import the default export from smsService.js
import sendSms from '../utils/smsService.js'; // Changed this line

const router = express.Router();

// JWT Secret (should be in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_for_hsit_app';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '30d'; // Token expires in 30 days


// --- Your existing /register route or other routes that use SMS ---
// Example of where you might be trying to use sendVerificationText:
router.post('/register', async (req, res) => {
    const { email, username, password, phoneNumber, inviteCode } = req.body;

    // ... (your existing validation logic) ...

    try {
        // ... (user existence checks etc.) ...

        if (phoneNumber) { // If phone number is provided, proceed with SMS verification
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store pending registration with SMS code
            // ... (logic to save to PendingRegistration model) ...

            // Use the imported sendSms function
            const smsResult = await sendSms(phoneNumber, `Your HSIT verification code is: ${verificationCode}`);

            if (!smsResult.success) {
                // Handle SMS sending failure
                console.error('Failed to send SMS verification code during registration:', smsResult.error);
                // Decide on error response, maybe allow registration but mark phone as unverified
                // For now, let's assume it should proceed but log the error.
                // Or return res.status(500).json({ success: false, message: `Failed to send SMS: ${smsResult.error}` });
            }
        }
        
        // ... (rest of your registration logic: saving user, etc.) ...
        // Example:
        // const newUser = new User({ /* ... user data ... */ });
        // await newUser.save();
        // return res.status(201).json({ success: true, message: "User registered. Please check email/SMS for verification if applicable." });


    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
    // Make sure to send a response for all paths
    // This is just a placeholder if your logic doesn't cover all cases above
    // res.status(400).json({ success: false, message: "Incomplete registration data or flow."});
});


// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  // ... your existing login logic
});

// @route   GET api/auth
// @desc    Get user data (excluding password)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  // ... your existing get user data logic
});


// @route   POST api/auth/request-password-reset
// @desc    Request a password reset link
// @access  Public
router.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            console.log(`Password reset request for non-existent email: ${email}`);
            return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 3600000; // Token expires in 1 hour

        await user.save();

        const resetUrl = `https://hsitapp.link/reset_password.html?token=${resetToken}`;
        const emailSubject = 'Password Reset Request - HSIT App';
        const emailText = `You are receiving this email because you (or someone else) have requested to reset the password for your account on HSIT App.\n\n` +
                          `Please click on the following link, or paste it into your browser, to complete the process:\n\n` +
                          `${resetUrl}\n\n` +
                          `This link will expire in one hour.\n\n` +
                          `If you did not request this password reset, please ignore this email and your password will remain unchanged.\n`;
        
        try {
            await sendEmail({ // Using the generic sendEmail function
                to: user.email,
                subject: emailSubject,
                text: emailText,
            });
            console.log(`Password reset email sent to: ${user.email}`);
            return res.json({ success: true, message: 'Password reset email sent. Please check your inbox.' });
        } catch (emailError) {
            console.error(`Error sending password reset email to ${user.email}:`, emailError);
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();
            return res.status(500).json({ success: false, message: 'Error sending password reset email. Please try again later.' });
        }

    } catch (error) {
        console.error('Server error in /request-password-reset:', error);
        return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    }
});

// --- Other routes (e.g., /verify-email, /resend-verification) continue below ---

export default router;
