import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import CryptoAddress from '../models/CryptoAddress.js';
import CryptoAddressService from '../services/CryptoAddressService.js';

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

    // Read BTC addresses from CSV
    const btcFilePath = path.join(__dirname, '../../bitcoin.csv');
    let btcAddresses = [];
    if (fs.existsSync(btcFilePath)) {
      const btcData = fs.readFileSync(btcFilePath, 'utf8');
      btcAddresses = btcData.split('\n').filter(line => line.trim() !== '');
      console.log(`Found ${btcAddresses.length} BTC addresses in CSV`);
    } else {
      console.warn(`BTC addresses file not found at ${btcFilePath}`);
    }
    
    // Read ETH addresses from CSV
    const ethFilePath = path.join(__dirname, '../../ethereum.csv');
    let ethAddresses = [];
    if (fs.existsSync(ethFilePath)) {
      const ethData = fs.readFileSync(ethFilePath, 'utf8');
      ethAddresses = ethData.split('\n').filter(line => line.trim() !== '');
      console.log(`Found ${ethAddresses.length} ETH addresses in CSV`);
    } else {
      console.warn(`ETH addresses file not found at ${ethFilePath}`);
    }
    
    // Read USDT addresses from CSV
    const usdtFilePath = path.join(__dirname, '../../usdt.csv');
    let usdtAddresses = [];
    if (fs.existsSync(usdtFilePath)) {
      const usdtData = fs.readFileSync(usdtFilePath, 'utf8');
      usdtAddresses = usdtData.split('\n').filter(line => line.trim() !== '');
      console.log(`Found ${usdtAddresses.length} USDT addresses in CSV`);
    } else {
      console.warn(`USDT addresses file not found at ${usdtFilePath}`);
    }
    
    // Import BTC addresses to database
    const btcResults = await CryptoAddressService.importAddresses(
      btcAddresses.map(address => ({
        address,
        currency: 'BTC',
        isAssigned: false,
        isActive: true,
        metadata: {
          importBatch: `import_${Date.now()}`,
          source: 'bitcoin.csv'
        }
      }))
    );
    
    // Import ETH addresses to database
    const ethResults = await CryptoAddressService.importAddresses(
      ethAddresses.map(address => ({
        address,
        currency: 'ETH',
        isAssigned: false,
        isActive: true,
        metadata: {
          importBatch: `import_${Date.now()}`,
          source: 'ethereum.csv'
        }
      }))
    );
    
    // Import USDT addresses to database
    const usdtResults = await CryptoAddressService.importAddresses(
      usdtAddresses.map(address => ({
        address,
        currency: 'USDT',
        isAssigned: false,
        isActive: true,
        metadata: {
          importBatch: `import_${Date.now()}`,
          source: 'usdt.csv'
        }
      }))
    );
    
    console.log('Import results:');
    console.log(`BTC: ${btcResults.imported} imported, ${btcResults.duplicates} duplicates, ${btcResults.errors.length} errors`);
    console.log(`ETH: ${ethResults.imported} imported, ${ethResults.duplicates} duplicates, ${ethResults.errors.length} errors`);
    console.log(`USDT: ${usdtResults.imported} imported, ${usdtResults.duplicates} duplicates, ${usdtResults.errors.length} errors`);
    
    // Check for any addresses that might be in used.csv but not marked as assigned in the database
    try {
      const usedFilePath = path.join(__dirname, '../../used.csv');
      if (fs.existsSync(usedFilePath)) {
        const usedData = fs.readFileSync(usedFilePath, 'utf8');
        const usedAddresses = usedData.split('\n').filter(line => line.trim() !== '');
        console.log(`Found ${usedAddresses.length} addresses in used.csv`);
        
        // Mark these addresses as used in the database if they exist
        let markedCount = 0;
        for (const address of usedAddresses) {
          const result = await CryptoAddress.updateOne(
            { address, isAssigned: false },
            { 
              isAssigned: true,
              metadata: {
                notes: 'Marked as used from used.csv during migration',
                importBatch: `used_migration_${Date.now()}`
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            markedCount++;
          }
        }
        
        console.log(`Marked ${markedCount} addresses from used.csv as assigned in the database`);
      }
    } catch (usedError) {
      console.error('Error processing used.csv:', usedError);
    }
    
    // Get statistics
    const btcCount = await CryptoAddress.countDocuments({ currency: 'BTC' });
    const ethCount = await CryptoAddress.countDocuments({ currency: 'ETH' });
    const usdtCount = await CryptoAddress.countDocuments({ currency: 'USDT' });
    const assignedCount = await CryptoAddress.countDocuments({ isAssigned: true });
    const unassignedCount = await CryptoAddress.countDocuments({ isAssigned: false });
    
    console.log('Address Statistics:');
    console.log(`Total BTC addresses: ${btcCount}`);
    console.log(`Total ETH addresses: ${ethCount}`);
    console.log(`Total USDT addresses: ${usdtCount}`);
    console.log(`Assigned addresses: ${assignedCount}`);
    console.log(`Unassigned addresses: ${unassignedCount}`);
    
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
