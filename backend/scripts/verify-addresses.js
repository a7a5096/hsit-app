/**
 * Verification script for crypto address assignments
 * 
 * This script checks for any duplicate address assignments in the database
 * and ensures no address is assigned to multiple users.
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import { config } from '../config/config.js';

// Connect to MongoDB
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB Connected...');
  verifyAddressAssignments();
}).catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

/**
 * Verify address assignments for uniqueness and consistency
 */
async function verifyAddressAssignments() {
  try {
    console.log('Starting address assignment verification...');
    
    // 1. Check for addresses assigned to multiple users
    const duplicateAssignments = [];
    
    // Get all used addresses
    const usedAddresses = await CryptoAddress.find({ used: true });
    console.log(`Found ${usedAddresses.length} used addresses`);
    
    // Check each address in user records
    for (const address of usedAddresses) {
      const users = await User.find({
        $or: [
          { 'walletAddresses.bitcoin': address.address },
          { 'walletAddresses.ethereum': address.address },
          { 'walletAddresses.usdt': address.address }
        ]
      });
      
      if (users.length > 1) {
        duplicateAssignments.push({
          address: address.address,
          currency: address.currency,
          userCount: users.length,
          userIds: users.map(u => u._id)
        });
      } else if (users.length === 0) {
        console.log(`Address ${address.address} is marked as used but not assigned to any user`);
      }
    }
    
    // 2. Check for users with multiple addresses for the same currency
    const usersWithMultipleAddresses = [];
    const allUsers = await User.find({ 'walletAddresses': { $exists: true } });
    
    for (const user of allUsers) {
      // Skip users without wallet addresses
      if (!user.walletAddresses) continue;
      
      // Check if user has multiple Bitcoin addresses
      const bitcoinAddresses = await CryptoAddress.find({
        currency: 'bitcoin',
        used: true,
        assignedTo: user._id
      });
      
      if (bitcoinAddresses.length > 1) {
        usersWithMultipleAddresses.push({
          userId: user._id,
          currency: 'bitcoin',
          addressCount: bitcoinAddresses.length,
          addresses: bitcoinAddresses.map(a => a.address)
        });
      }
      
      // Check if user has multiple Ethereum addresses
      const ethereumAddresses = await CryptoAddress.find({
        currency: 'ethereum',
        used: true,
        assignedTo: user._id
      });
      
      if (ethereumAddresses.length > 1) {
        usersWithMultipleAddresses.push({
          userId: user._id,
          currency: 'ethereum',
          addressCount: ethereumAddresses.length,
          addresses: ethereumAddresses.map(a => a.address)
        });
      }
      
      // Check if user has multiple USDT addresses
      const usdtAddresses = await CryptoAddress.find({
        currency: 'usdt',
        used: true,
        assignedTo: user._id
      });
      
      if (usdtAddresses.length > 1) {
        usersWithMultipleAddresses.push({
          userId: user._id,
          currency: 'usdt',
          addressCount: usdtAddresses.length,
          addresses: usdtAddresses.map(a => a.address)
        });
      }
    }
    
    // 3. Check for inconsistencies between CryptoAddress and User collections
    const inconsistencies = [];
    
    for (const user of allUsers) {
      // Skip users without wallet addresses
      if (!user.walletAddresses) continue;
      
      // Check Bitcoin address
      if (user.walletAddresses.bitcoin) {
        const bitcoinAddress = await CryptoAddress.findOne({
          address: user.walletAddresses.bitcoin,
          currency: 'bitcoin'
        });
        
        if (!bitcoinAddress) {
          inconsistencies.push({
            userId: user._id,
            currency: 'bitcoin',
            address: user.walletAddresses.bitcoin,
            issue: 'Address not found in CryptoAddress collection'
          });
        } else if (!bitcoinAddress.used) {
          inconsistencies.push({
            userId: user._id,
            currency: 'bitcoin',
            address: user.walletAddresses.bitcoin,
            issue: 'Address not marked as used in CryptoAddress collection'
          });
        } else if (!bitcoinAddress.assignedTo || !bitcoinAddress.assignedTo.equals(user._id)) {
          inconsistencies.push({
            userId: user._id,
            currency: 'bitcoin',
            address: user.walletAddresses.bitcoin,
            issue: 'Address assigned to different user in CryptoAddress collection',
            assignedTo: bitcoinAddress.assignedTo
          });
        }
      }
      
      // Check Ethereum address
      if (user.walletAddresses.ethereum) {
        const ethereumAddress = await CryptoAddress.findOne({
          address: user.walletAddresses.ethereum,
          currency: 'ethereum'
        });
        
        if (!ethereumAddress) {
          inconsistencies.push({
            userId: user._id,
            currency: 'ethereum',
            address: user.walletAddresses.ethereum,
            issue: 'Address not found in CryptoAddress collection'
          });
        } else if (!ethereumAddress.used) {
          inconsistencies.push({
            userId: user._id,
            currency: 'ethereum',
            address: user.walletAddresses.ethereum,
            issue: 'Address not marked as used in CryptoAddress collection'
          });
        } else if (!ethereumAddress.assignedTo || !ethereumAddress.assignedTo.equals(user._id)) {
          inconsistencies.push({
            userId: user._id,
            currency: 'ethereum',
            address: user.walletAddresses.ethereum,
            issue: 'Address assigned to different user in CryptoAddress collection',
            assignedTo: ethereumAddress.assignedTo
          });
        }
      }
      
      // Check USDT address
      if (user.walletAddresses.usdt && user.walletAddresses.usdt !== user.walletAddresses.ethereum) {
        const usdtAddress = await CryptoAddress.findOne({
          address: user.walletAddresses.usdt,
          currency: 'usdt'
        });
        
        if (!usdtAddress) {
          inconsistencies.push({
            userId: user._id,
            currency: 'usdt',
            address: user.walletAddresses.usdt,
            issue: 'Address not found in CryptoAddress collection'
          });
        } else if (!usdtAddress.used) {
          inconsistencies.push({
            userId: user._id,
            currency: 'usdt',
            address: user.walletAddresses.usdt,
            issue: 'Address not marked as used in CryptoAddress collection'
          });
        } else if (!usdtAddress.assignedTo || !usdtAddress.assignedTo.equals(user._id)) {
          inconsistencies.push({
            userId: user._id,
            currency: 'usdt',
            address: user.walletAddresses.usdt,
            issue: 'Address assigned to different user in CryptoAddress collection',
            assignedTo: usdtAddress.assignedTo
          });
        }
      }
    }
    
    // Print verification results
    console.log('\n=== Address Assignment Verification Results ===\n');
    
    console.log(`Duplicate Assignments: ${duplicateAssignments.length}`);
    if (duplicateAssignments.length > 0) {
      console.log(JSON.stringify(duplicateAssignments, null, 2));
    }
    
    console.log(`\nUsers with Multiple Addresses: ${usersWithMultipleAddresses.length}`);
    if (usersWithMultipleAddresses.length > 0) {
      console.log(JSON.stringify(usersWithMultipleAddresses, null, 2));
    }
    
    console.log(`\nInconsistencies: ${inconsistencies.length}`);
    if (inconsistencies.length > 0) {
      console.log(JSON.stringify(inconsistencies, null, 2));
    }
    
    if (duplicateAssignments.length === 0 && usersWithMultipleAddresses.length === 0 && inconsistencies.length === 0) {
      console.log('\nAll address assignments are valid and consistent!');
    } else {
      console.log('\nAddress assignment issues detected. Please run the migration script to fix these issues.');
    }
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Verification complete.');
  } catch (error) {
    console.error('Error during verification:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}
