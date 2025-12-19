import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import addressAssignmentService from '../services/addressAssignmentService.js';
import config from '../config/config.js';

// Load environment variables
dotenv.config();

/**
 * Assign Bitcoin addresses to all existing users
 */
async function assignAddressesToAllUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('username email _id walletAddresses');
    console.log(`Found ${users.length} users\n`);

    // Check available Bitcoin addresses
    const availableAddresses = await CryptoAddress.countDocuments({
      currency: 'bitcoin',
      assignedTo: null,
      used: false
    });
    console.log(`Available Bitcoin addresses: ${availableAddresses}\n`);

    if (availableAddresses < users.length) {
      console.warn(`⚠️  Warning: Only ${availableAddresses} addresses available for ${users.length} users`);
      console.warn('Some users may not receive addresses.\n');
    }

    console.log('='.repeat(100));
    console.log('ASSIGNING ADDRESSES TO ALL USERS');
    console.log('='.repeat(100));
    console.log('');

    const results = {
      total: users.length,
      assigned: 0,
      alreadyHadAddresses: 0,
      failed: 0,
      errors: []
    };

    // Assign addresses to each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Skip users without valid _id
      if (!user._id) {
        console.log(`[${i + 1}/${users.length}] Skipping user: ${user.username || user.email || 'unknown'} (no valid ID)`);
        results.failed++;
        results.errors.push({
          userId: 'unknown',
          username: user.username || user.email || 'unknown',
          error: 'User has no valid _id'
        });
        continue;
      }

      const userId = user._id.toString();
      console.log(`[${i + 1}/${users.length}] Processing user: ${user.username || user.email || userId}`);

      try {
        // Clear existing addresses and UserAddress entries to force fresh assignment
        const hadExistingAddress = user.walletAddresses && 
                                  user.walletAddresses.bitcoin && 
                                  user.walletAddresses.bitcoin.trim() !== '';

        if (hadExistingAddress) {
          console.log(`  → User had existing Bitcoin address: ${user.walletAddresses.bitcoin}`);
          console.log(`  → Clearing existing addresses and assigning new ones from pool...`);
        } else {
          console.log(`  → Assigning new addresses...`);
        }

        // Clear UserAddress collection entry if it exists
        const UserAddress = (await import('../models/UserAddress.js')).default;
        await UserAddress.deleteOne({ userId: user._id });

        // Clear wallet addresses in User model
        await User.findByIdAndUpdate(userId, {
          $set: {
            'walletAddresses.bitcoin': '',
            'walletAddresses.ethereum': '',
            'walletAddresses.ubt': ''
          }
        });

        // Assign new addresses from the pool
        const addresses = await addressAssignmentService.assignAddressesToUser(userId);
        
        console.log(`  ✓ Assigned Bitcoin address: ${addresses.BTC}`);
        console.log(`  ✓ Assigned Ethereum address: ${addresses.ETH}`);
        console.log(`  ✓ Assigned USDT address: ${addresses.USDT}`);
        
        if (hadExistingAddress) {
          results.alreadyHadAddresses++;
        } else {
          results.assigned++;
        }
      } catch (error) {
        console.error(`  ✗ Error assigning addresses: ${error.message}`);
        results.failed++;
        results.errors.push({
          userId: userId,
          username: user.username || user.email || userId,
          error: error.message
        });
      }
      console.log('');
    }

    // Summary
    console.log('='.repeat(100));
    console.log('ASSIGNMENT SUMMARY');
    console.log('='.repeat(100));
    console.log(`Total Users: ${results.total}`);
    console.log(`Newly Assigned: ${results.assigned}`);
    console.log(`Already Had Addresses: ${results.alreadyHadAddresses}`);
    console.log(`Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(err => {
        console.log(`  - ${err.username} (${err.userId}): ${err.error}`);
      });
    }

    // Final statistics
    const finalAssignedCount = await CryptoAddress.countDocuments({
      currency: 'bitcoin',
      assignedTo: { $ne: null }
    });
    const finalAvailableCount = await CryptoAddress.countDocuments({
      currency: 'bitcoin',
      assignedTo: null,
      used: false
    });

    console.log('\n' + '='.repeat(100));
    console.log('FINAL STATISTICS');
    console.log('='.repeat(100));
    console.log(`Total Bitcoin Addresses in Database: ${await CryptoAddress.countDocuments({ currency: 'bitcoin' })}`);
    console.log(`Assigned Bitcoin Addresses: ${finalAssignedCount}`);
    console.log(`Available Bitcoin Addresses: ${finalAvailableCount}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    console.log('\n✓ Address assignment completed!');
    
  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
assignAddressesToAllUsers();

