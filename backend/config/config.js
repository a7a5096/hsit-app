import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://a7a5096:MM00nngg2@cluster0hsit.xelat83.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0HSIT',
  JWT_SECRET: process.env.JWT_SECRET || 'hsit-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'a7a5096@googlemail.com',
  ADMIN_PHONE: process.env.ADMIN_PHONE || '931-321-0988',
  UBT_INITIAL_EXCHANGE_RATE: 1.0, // 1:1 initially
  UBT_EXCHANGE_RATE_INCREASE: 0.04, // 4% increase per withdrawal
  UBT_BUY_RATE_FACTOR: 0.98, // 0.98% of current exchange rate
  DIRECT_INVITE_BONUS: 10, // 10 UBT for direct invites
  SECOND_LEVEL_INVITE_BONUS: 15, // 15 UBT for second-level invites
  QUALIFIED_INVITES_FOR_FREE_BOT: 10 // Number of qualified invites needed for free bot
};

export default config;
