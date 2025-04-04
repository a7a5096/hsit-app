// Script to test crypto address assignment functionality
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/User');
const CryptoAddress = require('../models/CryptoAddress');
const { startDatabase } = require('./startDevDatabase');

async function testAddressAssignment() {
  let mongod;
  
  try {
    // Start in-memory database for testing
    mongod = await startDatabase();
    console.log('Test database started');
    
    // Import some test addresses
    const testBtcAddresses = [
      '1as4MZTVW362uNHhpkrhHeHYws9AG8Mdm',
      '1M8qHQg7pMV9s5esnNLEAVAq7EjKkU6h22',
      '17cQfUMhGUgZHKoRgErHfv4LuvNWTv3ZTK'
    ];
    
    const testEthAddresses = [
      '0xc48eA7e07164eCB2C9Ab882C0Ef4C02Df1FA269a',
      '0x0cBb0Fb2A44e1282710BA7ac4F7d566647379527',
      '0x8609CA11520Cb361B014947ed286C587D53b0D8b'
    ];
    
    // Import BTC addresses
    for (const address of testBtcAddresses) {
      const newAddress = new CryptoAddress({
        type: 'BTC',
        address,
        isAssigned: false
      });
      await newAddress.save();
    }
    
    // Import ETH addresses
    for (const address of testEthAddresses) {
      const newAddress = new CryptoAddress({
        type: 'ETH',
        address,
        isAssigned: false
      });
      await newAddress.save();
    }
    
    console.log('Test addresses imported');
    
    // Create test users
    const testUsers = [
      {
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'password123',
        phoneNumber: '+15551234567',
        isPhoneVerified: true
      },
      {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
        phoneNumber: '+15557654321',
        isPhoneVerified: true
      },
      {
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'password123',
        phoneNumber: '+15559876543',
        isPhoneVerified: false
      }
    ];
    
    // Create users and assign addresses
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      
      // Only assign addresses to verified users
      if (userData.isPhoneVerified) {
        // Find available BTC address
        const btcAddress = await CryptoAddress.findOne({ 
          type: 'BTC', 
          isAssigned: false 
        });
        
        // Find available ETH address
        const ethAddress = await CryptoAddress.findOne({ 
          type: 'ETH', 
          isAssigned: false 
        });
        
        if (btcAddress && ethAddress) {
          // Assign addresses to user
          user.btcAddress = btcAddress.address;
          user.ethAddress = ethAddress.address;
          await user.save();
          
          // Mark addresses as assigned
          btcAddress.isAssigned = true;
          btcAddress.assignedTo = user._id;
          btcAddress.assignedAt = Date.now();
          await btcAddress.save();
          
          ethAddress.isAssigned = true;
          ethAddress.assignedTo = user._id;
          ethAddress.assignedAt = Date.now();
          await ethAddress.save();
          
          console.log(`Addresses assigned to user ${user.username}:`);
          console.log(`BTC: ${btcAddress.address}`);
          console.log(`ETH: ${ethAddress.address}`);
        } else {
          console.log(`Not enough addresses available for user ${user.username}`);
        }
      } else {
        console.log(`User ${user.username} is not verified, skipping address assignment`);
      }
    }
    
    // Verify address assignment
    const users = await User.find();
    for (const user of users) {
      console.log(`\nUser: ${user.username} (Verified: ${user.isPhoneVerified})`);
      console.log(`BTC Address: ${user.btcAddress || 'None'}`);
      console.log(`ETH Address: ${user.ethAddress || 'None'}`);
      
      // Check if addresses are properly marked as assigned
      if (user.btcAddress) {
        const btcAddress = await CryptoAddress.findOne({ address: user.btcAddress });
        console.log(`BTC Address assigned: ${btcAddress.isAssigned}, to user: ${btcAddress.assignedTo}`);
      }
      
      if (user.ethAddress) {
        const ethAddress = await CryptoAddress.findOne({ address: user.ethAddress });
        console.log(`ETH Address assigned: ${ethAddress.isAssigned}, to user: ${ethAddress.assignedTo}`);
      }
    }
    
    // Check remaining unassigned addresses
    const unassignedBtc = await CryptoAddress.countDocuments({ type: 'BTC', isAssigned: false });
    const unassignedEth = await CryptoAddress.countDocuments({ type: 'ETH', isAssigned: false });
    
    console.log(`\nRemaining unassigned addresses:`);
    console.log(`BTC: ${unassignedBtc}`);
    console.log(`ETH: ${unassignedEth}`);
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close database connection
    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
      console.log('Test database stopped');
    }
  }
}

// Run the test
testAddressAssignment()
  .then(() => {
    console.log('Address assignment test completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
