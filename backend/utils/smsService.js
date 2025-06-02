import twilio from 'twilio';
import config from '../config/config.js'; // Assuming config.js is in the parent 'config' directory

// Initialize Twilio client
let client;
const accountSid = process.env.TWILIO_ACCOUNT_SID || config.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN || config.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || config.TWILIO_PHONE_NUMBER;

try {
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) are not fully configured. Please check environment variables or config file.');
  }
  client = twilio(accountSid, authToken);
  console.log('Twilio client initialized successfully');
} catch (error) {
  console.warn('Warning: Twilio client initialization failed. SMS features will be disabled.', error.message);
  // Create a fallback client that logs but doesn't throw errors, to prevent app crash if Twilio is optional
  client = {
    messages: {
      create: async (opts) => {
        console.warn(`Fallback SMS (Twilio not initialized): SMS would be sent to ${opts.to} from ${opts.from} with body: "${opts.body}"`);
        // Simulate a successful response structure for consistent handling by calling code
        return { 
          sid: 'fallback-sms-' + Date.now(),
          status: 'sent_fallback', // Custom status
          error_code: null,
          error_message: null
        };
      }
    }
  };
}

/**
 * Send an SMS message using Twilio.
 * @param {string} phoneNumber - The recipient's phone number (e.g., '+12345678901').
 * @param {string} body - The text message content.
 * @returns {Promise<object>} - Object indicating success or failure, and message SID or error.
 */
export const sendSms = async (phoneNumber, body) => {
  if (!client) { 
    console.error('Critical: Twilio client is null even after fallback. SMS not sent.');
    return { success: false, error: 'SMS service critical failure.' };
  }
  if (!phoneNumber || phoneNumber === 'optional' || !body) {
    let logMessage = 'SMS sending skipped - ';
    if(!phoneNumber || phoneNumber === 'optional') logMessage += 'no valid phone number provided. ';
    if(!body) logMessage += 'no body provided.';
    console.log(logMessage.trim());
    return {
      success: true, 
      message: 'SMS not sent due to missing phone number or body.',
      messageId: 'skipped-sms'
    };
  }
  
  try {
    const message = await client.messages.create({
      body: body,
      from: twilioPhoneNumber,
      to: phoneNumber
    });
    console.log(`SMS sent to ${phoneNumber}. SID: ${message.sid}`);
    return {
      success: true,
      messageId: message.sid
    };
  } catch (error) {
    console.error(`Error sending SMS to ${phoneNumber}:`, error.message);
    let errorMessage = error.message;
    if (error.code === 21211) {
        errorMessage = `Invalid recipient phone number: ${phoneNumber}. Please ensure it includes the country code (e.g., +1).`;
    } else if (error.code === 21614) {
        errorMessage = `The recipient phone number ${phoneNumber} is not a valid mobile number or is not SMS-capable.`;
    }
    return {
      success: false,
      error: errorMessage,
      errorCode: error.code 
    };
  }
};

/**
 * Send withdrawal notification SMS to admin.
 * (This function was named sendWithdrawalNotification in your provided file)
 * @param {Object} withdrawalData - Withdrawal details.
 * @returns {Promise<object>} - SMS sending result.
 */
export const sendWithdrawalNotificationSms = async (withdrawalData) => {
  if (!config.ADMIN_PHONE) {
    console.warn("Admin phone number not configured. Cannot send withdrawal SMS notification.");
    return { success: false, error: "Admin phone number not configured." };
  }
  try {
    const { userId, username, amount, currency, walletAddress } = withdrawalData;
    const bodyMsg = `WITHDRAWAL REQUEST: User ${username} (ID: ${userId}) has requested to withdraw ${amount} ${currency} to wallet ${walletAddress}`;
    
    // Using the generic sendSms function
    return await sendSms(config.ADMIN_PHONE, bodyMsg);

  } catch (error) {
    console.error('Error preparing or sending withdrawal notification SMS:', error);
    return {
      success: false,
      error: error.message // The error from sendSms will be more specific
    };
  }
};

// Note: The function 'sendVerificationSMS' from your provided file has effectively been
// replaced by the more generic 'sendSms'. Your 'auth.js' or other files
// calling it should now call 'sendSms' and construct the verification message body themselves.
// For example: await sendSms(phoneNumber, `Your HSIT verification code is: ${verificationCode}.`);
