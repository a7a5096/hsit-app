import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import UserAddress from '../models/UserAddress.js';

dotenv.config({ path: '../../.env' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function listUserDepositAddresses() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all users as a map for quick lookup
    const users = await User.find({}, 'username email').lean();
    const userMap = new Map();
    for (const u of users) {
      userMap.set(u._id.toString(), u);
    }
    console.log(`Found ${users.length} users\n`);

    // Get all user addresses (without populate to avoid ObjectId issues)
    const userAddresses = await UserAddress.find({}).lean();

    console.log('='.repeat(100));
    console.log('USER DEPOSIT ADDRESSES');
    console.log('='.repeat(100));
    console.log('');

    if (userAddresses.length === 0) {
      console.log('No deposit addresses assigned yet.');
    } else {
      for (const ua of userAddresses) {
        // Look up user from map
        const userIdStr = ua.userId?.toString();
        const user = userMap.get(userIdStr);
        const username = user?.username || 'Unknown';
        const email = user?.email || 'Unknown';
        
        console.log(`Username: ${username}`);
        console.log(`Email: ${email}`);
        console.log('-'.repeat(60));
        
        if (ua.addresses) {
          if (ua.addresses.BTC?.address) {
            console.log(`  BTC:  ${ua.addresses.BTC.address}`);
          }
          if (ua.addresses.ETH?.address) {
            console.log(`  ETH:  ${ua.addresses.ETH.address}`);
          }
          if (ua.addresses.USDT?.address) {
            console.log(`  USDT: ${ua.addresses.USDT.address}`);
          }
        }
        console.log('');
      }
    }

    console.log('='.repeat(100));
    console.log(`Total users with assigned addresses: ${userAddresses.length}`);
    console.log('='.repeat(100));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database.');
  }
}

listUserDepositAddresses();
