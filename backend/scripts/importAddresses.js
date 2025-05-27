// Script to import crypto addresses from CSV files to database
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
    // Read BTC addresses from CSV
    const btcFilePath = path.join(__dirname, '../../bitcoin.csv');
    const btcData = fs.readFileSync(btcFilePath, 'utf8');
    const btcAddresses = btcData.split('\n').filter(line => line.trim() !== '');
    console.log(`Found ${btcAddresses.length} BTC addresses in CSV`);
    
    // Read ETH addresses from CSV
    const ethFilePath = path.join(__dirname, '../../ethereum.csv');
    const ethData = fs.readFileSync(ethFilePath, 'utf8');
    const ethAddresses = ethData.split('\n').filter(line => line.trim() !== '');
    console.log(`Found ${ethAddresses.length} ETH addresses in CSV`);
    
    // Read USDT addresses from CSV
    const usdtFilePath = path.join(__dirname, '../../usdt.csv');
    const usdtData = fs.readFileSync(usdtFilePath, 'utf8');
    const usdtAddresses = usdtData.split('\n').filter(line => line.trim() !== '');
    console.log(`Found ${usdtAddresses.length} USDT addresses in CSV`);
    
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
    
    console.log('Import completed successfully');
  } catch (error) {
    console.error('Error during import:', error);
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
