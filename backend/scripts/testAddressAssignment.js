/**
 * Test script for crypto address assignment
 * This script tests the database-based crypto address assignment logic
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import cryptoAddressService from '../services/cryptoAddressService.js';

// MongoDB connection string
const MONGO_URI = 'mongodb+srv://a7a5096:MM00nngg2@cluster0hsit.xelat83.mongodb.net/HSIT?retryWrites=true&w=majority&appName=Cluster0HSIT';

// Test user ID (replace with a valid user ID from your database)
const TEST_USER_ID = '60d0fe4f5311236168a109ca'; // This is a placeholder

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Test functions
const testImportAddresses = async () => {
  console.log('\n--- Testing Import Addresses ---');
  
  // Sample addresses for testing
  const btcAddresses = [
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    '12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX',
    '1HLoD9E4SDFFPDiYfNYnkBLQ85Y51J3Zb1'
  ];
  
  const ethAddresses = [
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359'
  ];
  
  // Test BTC import
  console.log('Importing BTC addresses...');
  const btcResult = await cryptoAddressService.importCryptoAddresses(btcAddresses, 'BTC');
  console.log('BTC import result:', btcResult);
  
  // Test ETH import
  console.log('Importing ETH addresses...');
  const ethResult = await cryptoAddressService.importCryptoAddresses(ethAddresses, 'ETH');
  console.log('ETH import result:', ethResult);
  
  return { btcResult, ethResult };
};

const testAssignAddress = async (userId, cryptoType) => {
  console.log(`\n--- Testing Assign ${cryptoType} Address ---`);
  console.log(`Assigning ${cryptoType} address to user ${userId}...`);
  
  const result = await cryptoAddressService.assignCryptoAddress(userId, cryptoType);
  console.log(`${cryptoType} assignment result:`, result);
  
  return result;
};

const testGetUserAddresses = async (userId) => {
  console.log('\n--- Testing Get User Addresses ---');
  console.log(`Getting addresses for user ${userId}...`);
  
  const result = await cryptoAddressService.getUserCryptoAddresses(userId);
  console.log('User addresses result:', result);
  
  return result;
};

const runTests = async () => {
  try {
    // First, import some test addresses
    await testImportAddresses();
    
    // Find a test user or create one if needed
    let testUser = await User.findById(TEST_USER_ID).catch(() => null);
    
    if (!testUser) {
      console.log('\nTest user not found, finding any user...');
      testUser = await User.findOne();
      
      if (!testUser) {
        console.log('No users found in database. Creating a test user...');
        testUser = new User({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          phoneNumber: '+1234567890'
        });
        await testUser.save();
      }
    }
    
    console.log(`Using test user: ${testUser._id} (${testUser.username})`);
    
    // Test assigning BTC address
    await testAssignAddress(testUser._id, 'BTC');
    
    // Test assigning ETH address
    await testAssignAddress(testUser._id, 'ETH');
    
    // Test getting user addresses
    await testGetUserAddresses(testUser._id);
    
    console.log('\n--- All Tests Completed ---');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the tests
runTests();
