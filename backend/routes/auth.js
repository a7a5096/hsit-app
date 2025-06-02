import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // For generating reset token
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';
import PendingRegistration from '../models/PendingRegistration.js';
import { sendVerificationEmail, sendEmail } from '../utils/emailService.js'; // Ensure sendEmail is exported from emailService
import { sendVerificationText } from '../utils/smsService.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// JWT Secret (should be in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_for_hsit_app';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '30d'; // Token expires in 30 days

// --- Existing routes (/register, /login, / , etc.) remain here ---
// Example:
// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  // ... your existing registration logic
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


// --- NEW ROUTE: Request Password Reset ---
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
            // To prevent email enumeration, send a generic success message
            // even if the user is not found.
            console.log(`Password reset request for non-existent email: ${email}`);
            return res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Store the plain token for sending in the email link
        // For enhanced security, you could hash this token before saving it to DB
        // and then find the user by the hashed token in the reset password step.
        // For simplicity now, we store the plain token but ensure it's short-lived.
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 3600000; // Token expires in 1 hour (3600000 ms)

        await user.save();

        // Construct reset URL (adjust domain as needed)
        const resetUrl = `https://hsitapp.link/reset_password.html?token=${resetToken}`;

        const emailSubject = 'Password Reset Request - HSIT App';
        const emailText = `You are receiving this email because you (or someone else) have requested to reset the password for your account on HSIT App.\n\n` +
                          `Please click on the following link, or paste it into your browser, to complete the process:\n\n` +
                          `${resetUrl}\n\n` +
                          `This link will expire in one hour.\n\n` +
                          `If you did not request this password reset, please ignore this email and your password will remain unchanged.\n`;
        
        try {
            await sendEmail({
                to: user.email,
                subject: emailSubject,
                text: emailText,
                // html: `<p>...</p>` // Optionally, create an HTML version of the email
            });
            console.log(`Password reset email sent to: ${user.email}`);
            return res.json({ success: true, message: 'Password reset email sent. Please check your inbox.' });
        } catch (emailError) {
            console.error(`Error sending password reset email to ${user.email}:`, emailError);
            // If email sending fails, clear the token to prevent an unusable state
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
