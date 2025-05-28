import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import CryptoAddress from '../models/CryptoAddress.js';
import CryptoAddressService from '../services/CryptoAddressService.js';
import AddressService from '../services/AddressService.js';

// Initialize environment variables
dotenv.config();

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupAddresses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hsit_app');
    console.log('Connected to MongoDB');

    // Check if addresses already exist in the database
    const btcCount = await CryptoAddress.countDocuments({ currency: 'BTC' });
    const ethCount = await CryptoAddress.countDocuments({ currency: 'ETH' });
    const usdtCount = await CryptoAddress.countDocuments({ currency: 'USDT' });
    
    console.log(`Current address counts: BTC: ${btcCount}, ETH: ${ethCount}, USDT: ${usdtCount}`);
    
    // Only proceed with import if no addresses exist
    if (btcCount === 0 && ethCount === 0 && usdtCount === 0) {
      console.log('No addresses found in database. Please use the admin interface to import addresses.');
      console.log('Alternatively, you can use the API endpoint to import addresses programmatically.');
    } else {
      console.log('Addresses already exist in the database. No import needed.');
    }
    
    // Get statistics
    const stats = await AddressService.getAddressStats();
    console.log('Address Statistics:', stats);

    // Optionally assign to existing users
    const assignToExisting = process.argv.includes('--assign-existing');
    if (assignToExisting) {
      console.log('Assigning addresses to existing users...');
      const bulkResults = await AddressService.bulkAssignToExistingUsers();
      console.log(`Assigned addresses to ${bulkResults.length} users`);
    }
    
    console.log('Setup completed successfully!');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupAddresses();
}

export default setupAddresses;
