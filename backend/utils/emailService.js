import nodemailer from 'nodemailer';
import config from '../config/config.js';

// Transporter setup (ensure this is correct)
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: config.ADMIN_EMAIL, 
    pass: process.env.EMAIL_PASSWORD 
  }
});

export const sendEmail = async (mailOptionsPayload) => {
  // ... (existing generic sendEmail function)
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

// ... (other existing email functions like sendVerificationEmail, sendWithdrawalNotificationEmail, sendExchangeNotificationEmail, sendDepositNotificationToAdmin)

/**
 * Send UBT Withdrawal Request notification to admin.
 * @param {object} withdrawalDetails - Information about the withdrawal.
 * @param {string} withdrawalDetails.username - Username of the requester.
 * @param {string} withdrawalDetails.userId - User ID of the requester.
 * @param {number} withdrawalDetails.amount - UBT amount requested for withdrawal.
 * @param {string} withdrawalDetails.destinationCurrency - Target currency (BTC, ETH, USDT).
 * @param {string} withdrawalDetails.destinationAddress - Target wallet address.
 * @returns {Promise<object>} - Email sending result.
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
  return sendEmail(emailPayload); // Uses the generic sendEmail
};
