// Script to import crypto addresses to database
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import CryptoAddress from '../models/CryptoAddress.js';
import CryptoAddressService from '../services/CryptoAddressService.js';

// Initialize environment variables
dotenv.config();

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  
  try {
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
    
    // Show current stats
    console.log('Current address statistics:');
    console.log(`Total BTC addresses: ${btcCount}`);
    console.log(`Total ETH addresses: ${ethCount}`);
    console.log(`Total USDT addresses: ${usdtCount}`);
    
    const assignedCount = await CryptoAddress.countDocuments({ isAssigned: true });
    const unassignedCount = await CryptoAddress.countDocuments({ isAssigned: false });
    
    console.log(`Assigned addresses: ${assignedCount}`);
    console.log(`Unassigned addresses: ${unassignedCount}`);
    
    console.log('Import check completed successfully');
  } catch (error) {
    console.error('Error during import check:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
