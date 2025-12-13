import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import models
import User from '../models/User.js';
import UserAddress from '../models/UserAddress.js';

async function listUsersAndAddresses() {
  try {
    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully.\n');

    // Fetch all users
    const users = await User.find({}, 'username _id').sort({ username: 1 });
    
    if (users.length === 0) {
      console.log('No users found in the database.');
      await mongoose.connection.close();
      return;
    }

    console.log(`Found ${users.length} users.\n`);
    console.log('=' .repeat(100));
    console.log('USERS AND THEIR DEPOSIT ADDRESSES');
    console.log('=' .repeat(100));
    console.log();

    // Fetch addresses for each user
    for (const user of users) {
      const userAddress = await UserAddress.findOne({ userId: user._id });
      
      console.log(`Username: ${user.username}`);
      console.log(`User ID: ${user._id}`);
      
      if (userAddress && userAddress.addresses) {
        if (userAddress.addresses.BTC && userAddress.addresses.BTC.address) {
          console.log(`  BTC Address:  ${userAddress.addresses.BTC.address}`);
          console.log(`    Assigned At: ${userAddress.addresses.BTC.assignedAt || 'N/A'}`);
          console.log(`    Active: ${userAddress.addresses.BTC.isActive ? 'Yes' : 'No'}`);
        } else {
          console.log(`  BTC Address:  Not assigned`);
        }
        
        if (userAddress.addresses.ETH && userAddress.addresses.ETH.address) {
          console.log(`  ETH Address:  ${userAddress.addresses.ETH.address}`);
          console.log(`    Assigned At: ${userAddress.addresses.ETH.assignedAt || 'N/A'}`);
          console.log(`    Active: ${userAddress.addresses.ETH.isActive ? 'Yes' : 'No'}`);
        } else {
          console.log(`  ETH Address:  Not assigned`);
        }
        
        if (userAddress.addresses.USDT && userAddress.addresses.USDT.address) {
          console.log(`  USDT Address: ${userAddress.addresses.USDT.address}`);
          console.log(`    Assigned At: ${userAddress.addresses.USDT.assignedAt || 'N/A'}`);
          console.log(`    Active: ${userAddress.addresses.USDT.isActive ? 'Yes' : 'No'}`);
        } else {
          console.log(`  USDT Address: Not assigned`);
        }
      } else {
        console.log(`  No deposit addresses assigned`);
      }
      
      console.log('-' .repeat(100));
      console.log();
    }

    console.log(`\nTotal users processed: ${users.length}`);
    
    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
listUsersAndAddresses();
