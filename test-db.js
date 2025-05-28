import mongoose from 'mongoose';
import { Schema } from 'mongoose';

// Define schemas for testing
const UserSchema = new Schema({
  username: String,
  email: String,
  password: String,
  phoneNumber: String,
  phoneVerified: Boolean,
  walletAddresses: {
    bitcoin: String,
    ethereum: String,
    ubt: String
  },
  balances: {
    btc: Number,
    eth: Number,
    usdt: Number,
    ubt: Number
  },
  cryptoBalance: Number,
  isVerified: Boolean,
  createdAt: Date,
  lastLogin: Date,
  lastSignIn: Date,
  consecutiveDays: Number
});

const VerificationCodeSchema = new Schema({
  phoneNumber: String,
  code: String,
  expiresAt: Date,
  createdAt: Date
});

const PendingRegistrationSchema = new Schema({
  username: String,
  email: String,
  password: String,
  phoneNumber: String,
  expiresAt: Date,
  createdAt: Date
});

const CryptoAddressSchema = new Schema({
  address: String,
  privateKey: String,
  currency: String,
  used: Boolean,
  assignedTo: Schema.Types.ObjectId,
  assignedAt: Date,
  createdAt: Date
});

// Create models
const User = mongoose.model('User', UserSchema);
const VerificationCode = mongoose.model('VerificationCode', VerificationCodeSchema);
const PendingRegistration = mongoose.model('PendingRegistration', PendingRegistrationSchema);
const CryptoAddress = mongoose.model('CryptoAddress', CryptoAddressSchema);

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/hsit_app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected: ' + conn.connection.host);
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    return false;
  }
};

// Test database connection and models
const testDatabase = async () => {
  console.log('Testing database connection and models...');
  
  // Test User model
  try {
    console.log('Testing User model...');
    const userCount = await User.countDocuments();
    console.log('User count:', userCount);
  } catch (error) {
    console.error('Error testing User model:', error.message);
  }
  
  // Test VerificationCode model
  try {
    console.log('\nTesting VerificationCode model...');
    const verificationCodeCount = await VerificationCode.countDocuments();
    console.log('VerificationCode count:', verificationCodeCount);
  } catch (error) {
    console.error('Error testing VerificationCode model:', error.message);
  }
  
  // Test PendingRegistration model
  try {
    console.log('\nTesting PendingRegistration model...');
    const pendingRegistrationCount = await PendingRegistration.countDocuments();
    console.log('PendingRegistration count:', pendingRegistrationCount);
  } catch (error) {
    console.error('Error testing PendingRegistration model:', error.message);
  }
  
  // Test CryptoAddress model
  try {
    console.log('\nTesting CryptoAddress model...');
    const cryptoAddressCount = await CryptoAddress.countDocuments();
    console.log('CryptoAddress count:', cryptoAddressCount);
  } catch (error) {
    console.error('Error testing CryptoAddress model:', error.message);
  }
  
  // Disconnect from MongoDB
  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
};

// Run tests
const runTests = async () => {
  const connected = await connectDB();
  if (connected) {
    await testDatabase();
  }
};

runTests();
