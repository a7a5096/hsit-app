import twilio from 'twilio';
import config from '../config/config.js';

// Initialize Twilio client with error handling for production
let client;
try {
  client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  console.log('Twilio client initialized successfully');
} catch (error) {
  console.warn('Warning: Twilio client initialization failed. SMS features will be disabled.', error.message);
  // Create a fallback client that logs but doesn't throw errors
  client = {
    messages: {
      create: async (opts) => {
        console.log(`SMS would be sent to ${opts.to}: ${opts.body}`);
        return { sid: 'FALLBACK-' + Date.now() };
      }
    }
  };
}

/**
 * Send verification SMS to user's phone number
 * @param {string} phoneNumber - User's phone number
 * @param {string} verificationCode - Verification code to send
 * @returns {Promise} - Twilio message response
 */
export const sendVerificationSMS = async (phoneNumber, verificationCode) => {
  try {
    if (!phoneNumber || phoneNumber === 'optional') {
      console.log('Phone verification skipped - no phone number provided');
      return {
        success: true,
        messageId: 'skipped-verification'
      };
    }
    
    const message = await client.messages.create({
      body: `Your HSIT verification code is: ${verificationCode}. This code will expire in 10 minutes.`,
      from: config.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send withdrawal notification to admin
 * @param {Object} withdrawalData - Withdrawal details
 * @returns {Promise} - Twilio message response
 */
export const sendWithdrawalNotification = async (withdrawalData) => {
  try {
    const { userId, username, amount, currency, walletAddress } = withdrawalData;
    
    const message = await client.messages.create({
      body: `WITHDRAWAL REQUEST: User ${username} (ID: ${userId}) has requested to withdraw ${amount} ${currency} to wallet ${walletAddress}`,
      from: config.TWILIO_PHONE_NUMBER,
      to: config.ADMIN_PHONE
    });
    
    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    console.error('Error sending withdrawal notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
