/**
 * direct-sms-verification.js - Fixed Version
 * 
 * Clean implementation using direct SMS instead of Twilio Verify API.
 */

import express from 'express';
import twilio from 'twilio';
import { body, validationResult } from 'express-validator';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Initialize Twilio client
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,  // ACa349c314fae309a21427c73a204d7afc
    process.env.TWILIO_AUTH_TOKEN    // 29ebf5ec303ed1208d74592b114d2a31
);

// In-memory storage for verification codes
const verificationCodes = new Map();

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Start phone verification process
 * POST /api/auth/verify/start
 */

// In your direct-sms-verification.js file
router.post('/start', [
    body('phone').matches(/^\+[1-9]\d{1,14}$/).withMessage('Phone number must be in E.164 format')
], async (req, res) => {
    // Debug info
    console.log('Verification request received for phone:', req.body.phone);
    
    // Rest of your code...
    
    try {
        // Generate verification code
        const verificationCode = generateVerificationCode();
        console.log('Generated verification code:', verificationCode);
        
        // Store code with timestamp
        verificationCodes.set(phone, {
            code: verificationCode,
            timestamp: Date.now(),
            attempts: 0
        });
        
        // Send SMS with verification code
        console.log('Attempting to send SMS via Twilio to:', phone);
        
        await twilioClient.messages.create({
            body: `Your verification code is: ${verificationCode}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        }).then(message => console.log('SMS sent successfully, SID:', message.sid));

        // Success response
        return res.status(200).json({
            success: true,
            message: 'Verification code sent'
        });
    } catch (error) {
        console.error('SMS sending error details:', error);
        // Rest of error handling...
    }
});


/**
 * Check verification code
 * POST /api/auth/verify/check
 */
router.post('/verify/check', [
    body('phone').matches(/^\+[1-9]\d{1,14}$/).withMessage('Valid phone number is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Valid 6-digit code is required')
], async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { phone, code } = req.body;

    try {
        // Get stored verification data
        const verification = verificationCodes.get(phone);
        
        if (!verification) {
            return res.status(400).json({
                success: false,
                message: 'No verification code found for this phone number',
                verified: false
            });
        }
        
        // Check if code is expired (5 minutes)
        const expirationTime = verification.timestamp + (5 * 60 * 1000);
        if (Date.now() > expirationTime) {
            verificationCodes.delete(phone);
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired',
                verified: false
            });
        }
        
        // Check max attempts (limit to 3)
        verification.attempts += 1;
        if (verification.attempts > 3) {
            verificationCodes.delete(phone);
            return res.status(400).json({
                success: false,
                message: 'Too many failed attempts',
                verified: false
            });
        }
        
        // Check if code matches
        if (verification.code === code) {
            // Code verified - clear from storage
            verificationCodes.delete(phone);
            
            return res.status(200).json({
                success: true,
                message: 'Phone number verified successfully',
                verified: true
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code',
                verified: false,
                attemptsRemaining: 3 - verification.attempts
            });
        }
    } catch (error) {
        console.error('Verification check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify code',
            error: error.message
        });
    }
});

/**
 * Resend verification code
 * POST /api/auth/verify/resend
 */
router.post('/verify/resend', [
    body('phone').matches(/^\+[1-9]\d{1,14}$/).withMessage('Valid phone number is required')
], async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { phone } = req.body;

    try {
        // Check for existing verification
        const existingVerification = verificationCodes.get(phone);
        
        // Implement cooldown (1 minute between resends)
        if (existingVerification) {
            const timeRemaining = Math.ceil(((60 * 1000) - (Date.now() - existingVerification.timestamp)) / 1000);
            if (timeRemaining > 0) {
                return res.status(429).json({
                    success: false,
                    message: `Please wait ${timeRemaining} seconds before requesting a new code`
                });
            }
        }
        
        // Generate new verification code
        const verificationCode = generateVerificationCode();
        
        // Store code with timestamp
        verificationCodes.set(phone, {
            code: verificationCode,
            timestamp: Date.now(),
            attempts: 0
        });
        
        // Send SMS with verification code
        await twilioClient.messages.create({
            body: `Your verification code is: ${verificationCode}`,
            from: process.env.TWILIO_PHONE_NUMBER,  // +15873304312
            to: phone
        });

        return res.status(200).json({
            success: true,
            message: 'Verification code resent'
        });
    } catch (error) {
        console.error('Verification resend error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to resend verification code',
            error: error.message
        });
    }
});

export default router;
