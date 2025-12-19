import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import config from '../config/config.js';

// Load environment variables
dotenv.config();

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const listUsersBitcoinAddresses = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');
    console.log('Note: Private keys are automatically deobfuscated (reversed) when retrieved from database\n');

    // Get all users
    const users = await User.find({}).select('username email _id walletAddresses');
    console.log(`Found ${users.length} users\n`);
    console.log('='.repeat(100));
    console.log('USERS AND THEIR BITCOIN ADDRESSES WITH PRIVATE KEYS');
    console.log('='.repeat(100));
    console.log('');

    // For each user, find their Bitcoin addresses
    for (const user of users) {
      console.log(`User: ${user.username || 'N/A'}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log(`User ID: ${user._id}`);
      
      // Find Bitcoin addresses assigned to this user in CryptoAddress collection
      // Private keys will be automatically deobfuscated by the model's post hook
      const bitcoinAddresses = await CryptoAddress.find({
        assignedTo: user._id,
        currency: 'bitcoin'
      }).select('address privateKey assignedAt');

      if (bitcoinAddresses.length > 0) {
        console.log(`Bitcoin Addresses (${bitcoinAddresses.length}):`);
        bitcoinAddresses.forEach((addr, index) => {
          // Private key is already deobfuscated by the model
          const privateKey = addr.privateKey || 'NOT AVAILABLE';
          console.log(`  ${index + 1}. Address: ${addr.address}`);
          console.log(`     Private Key: ${privateKey}`);
          console.log(`     Assigned At: ${addr.assignedAt || 'N/A'}`);
        });
      } else {
        // Check if user has a Bitcoin address in walletAddresses field
        if (user.walletAddresses && user.walletAddresses.bitcoin) {
          const btcAddress = user.walletAddresses.bitcoin.trim();
          console.log(`Bitcoin Address (from walletAddresses): ${btcAddress}`);
          
          // Try to find the corresponding CryptoAddress record
          const cryptoAddr = await CryptoAddress.findOne({
            address: btcAddress,
            currency: 'bitcoin'
          });
          
          // Private key is already deobfuscated by the model
          const privateKey = (cryptoAddr && cryptoAddr.privateKey) ? cryptoAddr.privateKey : 'NOT AVAILABLE';
          console.log(`  Private Key: ${privateKey}`);
        } else {
          console.log(`Bitcoin Address: NOT ASSIGNED`);
        }
      }
      
      console.log('-'.repeat(100));
      console.log('');
    }

    // Summary
    const totalBitcoinAddresses = await CryptoAddress.countDocuments({ currency: 'bitcoin' });
    const assignedBitcoinAddresses = await CryptoAddress.countDocuments({ 
      currency: 'bitcoin',
      assignedTo: { $ne: null }
    });
    
    console.log('='.repeat(100));
    console.log('SUMMARY');
    console.log('='.repeat(100));
    console.log(`Total Users: ${users.length}`);
    console.log(`Total Bitcoin Addresses in Database: ${totalBitcoinAddresses}`);
    console.log(`Assigned Bitcoin Addresses: ${assignedBitcoinAddresses}`);
    console.log(`Unassigned Bitcoin Addresses: ${totalBitcoinAddresses - assignedBitcoinAddresses}`);

    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Run the script
listUsersBitcoinAddresses();

