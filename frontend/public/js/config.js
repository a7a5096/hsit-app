/**
 * config.js
 * 
 * Configuration settings for the frontend application.
 * This file should be loaded before other JavaScript files.
 * 
 * SECURITY NOTE: Never store sensitive credentials in frontend code.
 * All API calls requiring authentication should go through the backend.
 */

// Backend API URL
const API_URL = 'https://hsit-backend.onrender.com';

// Twilio verification settings (non-sensitive configuration only)
const TWILIO_SETTINGS = {
    verificationTimeoutSeconds: 300, // 5 minutes
    resendCooldownSeconds: 60        // 1 minute cooldown between resend attempts
};

// Other global configuration settings can be added here
