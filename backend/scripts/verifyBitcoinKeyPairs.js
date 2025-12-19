import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CryptoAddress from '../models/CryptoAddress.js';
import config from '../config/config.js';

// Load environment variables
dotenv.config();

async function verifyBitcoinKeyPairs() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Count Bitcoin addresses
    const totalCount = await CryptoAddress.countDocuments({ currency: 'bitcoin' });
    const assignedCount = await CryptoAddress.countDocuments({ 
      currency: 'bitcoin',
      assignedTo: { $ne: null }
    });
    const unassignedCount = totalCount - assignedCount;
    const withPrivateKeyCount = await CryptoAddress.countDocuments({ 
      currency: 'bitcoin',
      privateKey: { $exists: true, $ne: null }
    });

    console.log('='.repeat(100));
    console.log('BITCOIN KEY PAIRS VERIFICATION');
    console.log('='.repeat(100));
    console.log(`Total Bitcoin Addresses: ${totalCount}`);
    console.log(`Assigned Addresses: ${assignedCount}`);
    console.log(`Unassigned Addresses: ${unassignedCount}`);
    console.log(`Addresses with Private Keys: ${withPrivateKeyCount}`);
    console.log('');

    // Show sample of unassigned addresses
    const sampleAddresses = await CryptoAddress.find({
      currency: 'bitcoin',
      assignedTo: null
    })
    .limit(10)
    .select('address privateKey createdAt');

    if (sampleAddresses.length > 0) {
      console.log('Sample Unassigned Addresses (showing deobfuscated private keys):');
      console.log('-'.repeat(100));
      sampleAddresses.forEach((addr, idx) => {
        // Use getPrivateKey() method to ensure deobfuscation
        const deobfuscatedWIF = addr.getPrivateKey ? addr.getPrivateKey() : addr.privateKey;
        console.log(`${idx + 1}. Address: ${addr.address}`);
        console.log(`   Private Key (WIF - deobfuscated): ${deobfuscatedWIF || 'NOT SET'}`);
        console.log(`   Created: ${addr.createdAt}`);
        console.log('');
      });
    }

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
verifyBitcoinKeyPairs();

