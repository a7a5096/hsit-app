import nodemailer from 'nodemailer';
import config from '../config/config.js'; // Assuming config.js is in ../config/

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Consider environment variables for service, user, and pass
  auth: {
    user: config.ADMIN_EMAIL, // Make sure config.ADMIN_EMAIL is correctly defined
    pass: process.env.EMAIL_PASSWORD // Ensure EMAIL_PASSWORD is set in your .env file
  }
});

/**
 * Send a generic email.
 * @param {object} mailOptionsPayload - Object containing to, subject, text, and optionally html.
 * @param {string} mailOptionsPayload.to - Recipient's email address
 * @param {string} mailOptionsPayload.subject - Email subject
 * @param {string} mailOptionsPayload.text - Plain text body of the email
 * @param {string} [mailOptionsPayload.html] - HTML body of the email (optional)
 * @returns {Promise<object>} - Email sending result
 */
export const sendEmail = async (mailOptionsPayload) => {
  try {
    if (!mailOptionsPayload.to || !mailOptionsPayload.subject || !mailOptionsPayload.text) {
      throw new Error('Missing required email parameters: to, subject, or text must be provided.');
    }

    const mailOptions = {
      from: `"HSIT App" <${config.ADMIN_EMAIL}>`, // Optional: Add a sender name
      to: mailOptionsPayload.to,
      subject: mailOptionsPayload.subject,
      text: mailOptionsPayload.text,
    };

    if (mailOptionsPayload.html) {
      mailOptions.html = mailOptionsPayload.html;
    }
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`Generic email sent successfully to ${mailOptionsPayload.to} with Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending generic email:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} verificationCode - Verification code to send
 * @returns {Promise} - Email sending response
 */
export const sendVerificationEmail = async (email, verificationCode) => {
  const emailPayload = {
    to: email,
    subject: 'HSIT Account Verification',
    html: `
      <h1>Welcome to HSIT</h1>
      <p>Your verification code is: <strong>${verificationCode}</strong></p>
      <p>This code will expire in 10 minutes.</p>
    `,
    text: `Welcome to HSIT. Your verification code is: ${verificationCode}. This code will expire in 10 minutes.`
  };
  return sendEmail(emailPayload); // Use the generic sendEmail function
};

/**
 * Send withdrawal notification to admin
 * @param {Object} withdrawalData - Withdrawal details
 * @returns {Promise} - Email sending response
 */
export const sendWithdrawalNotificationEmail = async (withdrawalData) => {
  try {
    const { userId, username, amount, currency, walletAddress } = withdrawalData;
    
    const emailPayload = {
      to: config.ADMIN_EMAIL, // Send to admin
      subject: 'HSIT Withdrawal Request',
      html: `
        <h1>New Withdrawal Request</h1>
        <p><strong>User:</strong> ${username} (ID: ${userId})</p>
        <p><strong>Amount:</strong> ${amount} ${currency}</p>
        <p><strong>Wallet Address:</strong> ${walletAddress}</p>
        <p>Please process this request at your earliest convenience.</p>
      `,
      text: `New Withdrawal Request:\nUser: ${username} (ID: ${userId})\nAmount: ${amount} ${currency}\nWallet Address: ${walletAddress}\nPlease process this request.`
    };
    return sendEmail(emailPayload); // Use the generic sendEmail function
  } catch (error) {
    // The error handling is now within the generic sendEmail, 
    // but you can add specific logging here if needed before re-throwing or returning.
    console.error('Error preparing withdrawal notification email data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send exchange notification to admin
 * @param {Object} exchangeData - Exchange details
 * @returns {Promise} - Email sending response
 */
export const sendExchangeNotificationEmail = async (exchangeData) => {
  try {
    const { userId, username, fromAmount, fromCurrency, toAmount, toCurrency } = exchangeData;
    
    const emailPayload = {
      to: config.ADMIN_EMAIL, // Send to admin
      subject: 'HSIT Exchange Request',
      html: `
        <h1>New Exchange Request</h1>
        <p><strong>User:</strong> ${username} (ID: ${userId})</p>
        <p><strong>Exchange:</strong> ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}</p>
        <p>Please process this exchange request at your earliest convenience.</p>
      `,
      text: `New Exchange Request:\nUser: ${username} (ID: ${userId})\nExchange: ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}\nPlease process this exchange request.`
    };
    return sendEmail(emailPayload); // Use the generic sendEmail function
  } catch (error) {
    console.error('Error preparing exchange notification email data:', error);
    return { success: false, error: error.message };
  }
};
