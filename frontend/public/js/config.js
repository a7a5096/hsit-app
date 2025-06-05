/**
 * config.js
 * 
 * Configuration settings for the application.
 * This file should be loaded before other JavaScript files.
 */

// frontend/public/js/config.js
const API_URL = 'https://hsit-backend.onrender.com'; // Or your actual backend URL


// Twilio credentials (Consider moving to backend environment variables for security)
const TWILIO_CREDENTIALS = {
    accountSid: 'ACa349c314fae309a21427c73a204d7afc',
    authToken: '29ebf5ec303ed1208d74592b114d2a31',
    phoneNumber: '+15873304312'
};

// Twilio verification settings
const TWILIO_SETTINGS = {
    verificationTimeoutSeconds: 300, // 5 minutes
    resendCooldownSeconds: 60        // 1 minute cooldown between resend attempts
};

// Other global configuration settings can be added here

