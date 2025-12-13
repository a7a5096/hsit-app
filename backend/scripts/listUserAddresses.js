import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config({ path: '../.env' });
dotenv.config({ path: '../../.env' });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function listAllUserAddresses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const users = await User.find({}, 'username walletAddresses').lean();
    
    console.log('=' .repeat(120));
    console.log('USERS AND DEPOSIT ADDRESSES');
    console.log('=' .repeat(120));
    console.log(`Total Users: ${users.length}\n`);
    
    console.log('| ' + 'Username'.padEnd(25) + ' | ' + 'BTC Address'.padEnd(45) + ' | ' + 'ETH Address'.padEnd(45) + ' |');
    console.log('|' + '-'.repeat(27) + '|' + '-'.repeat(47) + '|' + '-'.repeat(47) + '|');
    
    for (const user of users) {
      const username = user.username || 'N/A';
      const btcAddr = user.walletAddresses?.bitcoin || 'Not assigned';
      const ethAddr = user.walletAddresses?.ethereum || 'Not assigned';
      
      console.log('| ' + username.padEnd(25) + ' | ' + btcAddr.padEnd(45) + ' | ' + ethAddr.padEnd(45) + ' |');
    }
    
    console.log('=' .repeat(120));
    
    // Also output as JSON for easier processing
    console.log('\n\nJSON Format:');
    console.log(JSON.stringify(users.map(u => ({
      username: u.username,
      btcAddress: u.walletAddresses?.bitcoin || null,
      ethAddress: u.walletAddresses?.ethereum || null,
      ubtAddress: u.walletAddresses?.ubt || null
    })), null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

listAllUserAddresses();
