import nodemailer from 'nodemailer';
import config from '../config/config.js'; // Assuming config.js path

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: config.ADMIN_EMAIL, 
    pass: process.env.EMAIL_PASSWORD // Ensure EMAIL_PASSWORD is set in your .env file
  }
});

/**
 * Send a generic email.
 * @param {object} mailOptionsPayload - Object containing to, subject, text, and optionally html.
 */
export const sendEmail = async (mailOptionsPayload) => {
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

/**
 * Send verification email to user
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
  return sendEmail(emailPayload);
};

/**
 * Send withdrawal notification email to admin
 */
export const sendWithdrawalNotificationEmail = async (withdrawalData) => {
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
  return sendEmail(emailPayload);
};

/**
 * Send exchange notification email to admin
 */
export const sendExchangeNotificationEmail = async (exchangeData) => {
   const { userId, username, fromAmount, fromCurrency, toAmount, toCurrency } = exchangeData;
   const emailPayload = {
    to: config.ADMIN_EMAIL,
    subject: 'HSIT Exchange Request',
    html: `
        <h1>New Exchange Request</h1>
        <p><strong>User:</strong> ${username} (ID: ${userId})</p>
        <p><strong>Exchange:</strong> ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}</p>
        <p>Please process this exchange request at your earliest convenience.</p>
      `,
    text: `New Exchange Request:\nUser: ${username} (ID: ${userId})\nExchange: ${fromAmount} ${fromCurrency} to ${toAmount} ${toCurrency}\nPlease process this exchange request.`
  };
  return sendEmail(emailPayload);
};

/**
 * Send UBT Withdrawal Request notification to admin.
 */
export const sendUbtWithdrawalRequestToAdmin = async (withdrawalDetails) => {
  const { username, userId, amount, destinationCurrency, destinationAddress } = withdrawalDetails;
  const emailPayload = {
    to: 'a7a5096@gmail.com', // Admin email
    subject: `New UBT Withdrawal Request: ${amount} UBT by ${username}`,
    html: `
      <h1>UBT Withdrawal Request</h1>
      <p>A user has requested to withdraw UBT:</p>
      <ul>
        <li><strong>User:</strong> ${username} (ID: ${userId})</li>
        <li><strong>UBT Amount to Withdraw:</strong> ${amount} UBT</li>
        <li><strong>Destination Currency:</strong> ${destinationCurrency.toUpperCase()}</li>
        <li><strong>Destination Address:</strong> ${destinationAddress}</li>
      </ul>
      <p>Please process this request within 48 hours.</p>
    `,
    text: `UBT Withdrawal Request:\nUser: ${username} (ID: ${userId})\nUBT Amount: ${amount}\nDestination Currency: ${destinationCurrency.toUpperCase()}\nDestination Address: ${destinationAddress}\nPlease process within 48 hours.`
  };
  console.log(`Sending UBT withdrawal request notification for user ${userId}, amount ${amount} UBT to ${destinationCurrency}`);
  return sendEmail(emailPayload);
};

/**
 * Send new deposit notification to admin.
 */
export const sendDepositNotificationToAdmin = async (depositInfo) => {
  const { username, userId, amount, currency, txHash } = depositInfo;
  const emailPayload = {
    to: 'a7a5096@gmail.com', 
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
