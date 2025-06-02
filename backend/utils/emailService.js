import nodemailer from 'nodemailer';
import config from '../config/config.js'; // Assuming config.js is in ../config/

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: config.ADMIN_EMAIL, 
    pass: process.env.EMAIL_PASSWORD 
  }
});

export const sendEmail = async (mailOptionsPayload) => {
  // ... (existing generic sendEmail function from previous step)
  try {
    if (!mailOptionsPayload.to || !mailOptionsPayload.subject || !mailOptionsPayload.text) {
      throw new Error('Missing required email parameters: to, subject, or text must be provided.');
    }
    const mailOptions = {
      from: `"HSIT App" <${config.ADMIN_EMAIL}>`, 
      to: mailOptionsPayload.to,
      subject: mailOptionsPayload.subject,
      text: mailOptionsPayload.text,
    };
    if (mailOptionsPayload.html) mailOptions.html = mailOptionsPayload.html;
    const info = await transporter.sendMail(mailOptions);
    console.log(`Generic email sent successfully to ${mailOptionsPayload.to} with Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending generic email:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendVerificationEmail = async (email, verificationCode) => {
  // ... (uses generic sendEmail)
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
  return sendEmail(emailPayload);
};

export const sendWithdrawalNotificationEmail = async (withdrawalData) => {
  // ... (uses generic sendEmail)
  const { userId, username, amount, currency, walletAddress } = withdrawalData;
  const emailPayload = {
    to: config.ADMIN_EMAIL,
    subject: 'HSIT Withdrawal Request',
    html: `<h1>New Withdrawal Request</h1>...`, // Your existing HTML
    text: `New Withdrawal Request:\nUser: ${username} (ID: ${userId})\nAmount: ${amount} ${currency}\nWallet Address: ${walletAddress}\nPlease process this request.`
  };
  return sendEmail(emailPayload);
};

export const sendExchangeNotificationEmail = async (exchangeData) => {
  // ... (uses generic sendEmail)
   const { userId, username, fromAmount, fromCurrency, toAmount, toCurrency } = exchangeData;
   const emailPayload = {
    to: config.ADMIN_EMAIL,
    subject: 'HSIT Exchange Request',
    html: `<h1>New Exchange Request</h1>...`, // Your existing HTML
    text: `New Exchange Request:\nUser: ${username} (ID: ${userId})\nExchange: ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}\nPlease process this exchange request.`
  };
  return sendEmail(emailPayload);
};

/**
 * Send new deposit notification to admin.
 * @param {object} depositInfo - Information about the deposit.
 * @param {string} depositInfo.username - Username of the depositor.
 * @param {string} depositInfo.userId - User ID of the depositor.
 * @param {number} depositInfo.amount - Amount deposited.
 * @param {string} depositInfo.currency - Currency of the deposit.
 * @param {string} depositInfo.txHash - Transaction hash/ID of the deposit (optional).
 * @returns {Promise<object>} - Email sending result.
 */
export const sendDepositNotificationToAdmin = async (depositInfo) => {
  const { username, userId, amount, currency, txHash } = depositInfo;
  const emailPayload = {
    to: 'a7a5096@gmail.com', // Your specified admin email
    subject: `New Deposit Received: ${amount} ${currency} by ${username}`,
    html: `
      <h1>New Deposit Notification</h1>
      <p>A new deposit has been credited to a user account:</p>
      <ul>
        <li><strong>User:</strong> ${username} (ID: ${userId})</li>
        <li><strong>Amount:</strong> ${amount} ${currency}</li>
        ${txHash ? `<li><strong>Transaction Hash:</strong> ${txHash}</li>` : ''}
      </ul>
      <p>Please verify and take any necessary actions.</p>
    `,
    text: `New Deposit Notification:\nUser: ${username} (ID: ${userId})\nAmount: ${amount} ${currency}\n${txHash ? `Transaction Hash: ${txHash}\n` : ''}\nPlease verify.`
  };
  console.log(`Sending deposit notification for user ${userId}, amount ${amount} ${currency}`);
  return sendEmail(emailPayload);
};
