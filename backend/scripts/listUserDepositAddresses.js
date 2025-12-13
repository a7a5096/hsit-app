import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import UserAddress from '../models/UserAddress.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function listUserDepositAddresses() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully!\n');

    // Fetch all users
    const users = await User.find({}, 'username email _id').sort({ username: 1 });
    console.log(`Found ${users.length} users\n`);
    console.log('='.repeat(120));
    console.log('USERNAME | EMAIL | BTC ADDRESS | ETH ADDRESS | USDT ADDRESS');
    console.log('='.repeat(120));

    // Prepare CSV data
    const csvRows = ['Username,Email,BTC Address,ETH Address,USDT Address'];

    // For each user, fetch their deposit addresses
    for (const user of users) {
      const userAddress = await UserAddress.findOne({ userId: user._id });
      
      const btcAddress = userAddress?.addresses?.BTC?.address || 'Not assigned';
      const ethAddress = userAddress?.addresses?.ETH?.address || 'Not assigned';
      const usdtAddress = userAddress?.addresses?.USDT?.address || 'Not assigned';

      console.log(`${user.username} | ${user.email} | ${btcAddress} | ${ethAddress} | ${usdtAddress}`);
      
      // Add to CSV
      csvRows.push(`"${user.username}","${user.email}","${btcAddress}","${ethAddress}","${usdtAddress}"`);
    }

    console.log('='.repeat(120));
    console.log(`\nTotal users: ${users.length}`);

    // Write CSV file
    const csvPath = path.resolve(__dirname, '../../user_deposit_addresses.csv');
    fs.writeFileSync(csvPath, csvRows.join('\n'));
    console.log(`\nCSV file saved to: ${csvPath}`);

    // Count users with assigned addresses
    const btcCount = await UserAddress.countDocuments({ 'addresses.BTC.address': { $exists: true, $ne: null } });
    const ethCount = await UserAddress.countDocuments({ 'addresses.ETH.address': { $exists: true, $ne: null } });
    const usdtCount = await UserAddress.countDocuments({ 'addresses.USDT.address': { $exists: true, $ne: null } });

    console.log(`Users with BTC addresses: ${btcCount}`);
    console.log(`Users with ETH addresses: ${ethCount}`);
    console.log(`Users with USDT addresses: ${usdtCount}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
listUserDepositAddresses();
