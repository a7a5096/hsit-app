import nodemailer from 'nodemailer';
import config from '../config/config.js';

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
export const sendVerificationEmail = async (email, verificationCode) => {
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
export const sendWithdrawalNotificationEmail = async (withdrawalData) => {
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

/**
 * Send exchange notification to admin
 * @param {Object} exchangeData - Exchange details
 * @returns {Promise} - Email sending response
 */
export const sendExchangeNotificationEmail = async (exchangeData) => {
  try {
    const { userId, username, fromAmount, fromCurrency, toAmount, toCurrency } = exchangeData;
    
    const mailOptions = {
      from: config.ADMIN_EMAIL,
      to: config.ADMIN_EMAIL,
      subject: 'HSIT Exchange Request',
      html: `
        <h1>New Exchange Request</h1>
        <p><strong>User:</strong> ${username} (ID: ${userId})</p>
        <p><strong>Exchange:</strong> ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}</p>
        <p>Please process this exchange request at your earliest convenience.</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending exchange notification email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
