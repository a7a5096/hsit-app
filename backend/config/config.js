import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// SECURITY: Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`FATAL ERROR: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const config = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PHONE: process.env.ADMIN_PHONE,
  UBT_INITIAL_EXCHANGE_RATE: parseFloat(process.env.UBT_INITIAL_EXCHANGE_RATE) || 1.0,
  UBT_EXCHANGE_RATE_INCREASE: parseFloat(process.env.UBT_RATE_INCREASE) || 0.04,
  UBT_BUY_RATE_FACTOR: parseFloat(process.env.UBT_BUY_RATE_FACTOR) || 0.98,
  DIRECT_INVITE_BONUS: 10, // 10 UBT for direct invites
  SECOND_LEVEL_INVITE_BONUS: 15, // 15 UBT for second-level invites
  QUALIFIED_INVITES_FOR_FREE_BOT: 10 // Number of qualified invites needed for free bot
};

export default config;
