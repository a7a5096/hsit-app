const nodemailer = require('nodemailer');
const config = require('../config/config');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.ADMIN_EMAIL,
    pass: process.env.EMAIL_PASSWORD // Should be set in .env file
  }
});

/**
 * Send verification email to user
 * @param {string} email - User's email address
 * @param {string} verificationCode - Verification code to send
 * @returns {Promise} - Email sending response
 */
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    const mailOptions = {
      from: config.ADMIN_EMAIL,
      to: email,
      subject: 'HSIT Account Verification',
      html: `
        <h1>Welcome to HSIT</h1>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send withdrawal notification to admin
 * @param {Object} withdrawalData - Withdrawal details
 * @returns {Promise} - Email sending response
 */
const sendWithdrawalNotificationEmail = async (withdrawalData) => {
  try {
    const { userId, username, amount, currency, walletAddress } = withdrawalData;
    
    const mailOptions = {
      from: config.ADMIN_EMAIL,
      to: config.ADMIN_EMAIL,
      subject: 'HSIT Withdrawal Request',
      html: `
        <h1>New Withdrawal Request</h1>
        <p><strong>User:</strong> ${username} (ID: ${userId})</p>
        <p><strong>Amount:</strong> ${amount} ${currency}</p>
        <p><strong>Wallet Address:</strong> ${walletAddress}</p>
        <p>Please process this request at your earliest convenience.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending withdrawal notification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendVerificationEmail,
  sendWithdrawalNotificationEmail
};
