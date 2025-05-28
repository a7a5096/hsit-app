import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import CryptoAddress from '../models/CryptoAddress.js';

// Migration function to move crypto addresses from CSV to database
export const migrateCryptoAddressesFromCsv = async () => {
  try {
    // Path to CSV files
    const bitcoinCsvPath = path.join(process.cwd(), '../csv/bitcoin.csv');
    const ethereumCsvPath = path.join(process.cwd(), '../csv/ethereum.csv');
    
    // Check if we already have addresses in the database
    const existingCount = await CryptoAddress.countDocuments();
    if (existingCount > 0) {
      console.log('Crypto addresses already migrated to database');
      return;
    }
    
    console.log('Migrating crypto addresses from CSV files to database...');
    
    // Read Bitcoin addresses
    if (fs.existsSync(bitcoinCsvPath)) {
      const bitcoinAddresses = [];
      await new Promise((resolve) => {
        fs.createReadStream(bitcoinCsvPath)
          .pipe(csv())
          .on('data', (row) => {
            bitcoinAddresses.push({
              address: row.address,
              privateKey: row.privateKey,
              currency: 'bitcoin',
              used: row.used === 'true' || row.used === '1'
            });
          })
          .on('end', resolve);
      });
      
      // Save to database
      if (bitcoinAddresses.length > 0) {
        await CryptoAddress.insertMany(bitcoinAddresses);
        console.log(`Migrated ${bitcoinAddresses.length} Bitcoin addresses to database`);
      }
    } else {
      console.warn('Bitcoin CSV file not found at:', bitcoinCsvPath);
    }
    
    // Read Ethereum addresses
    if (fs.existsSync(ethereumCsvPath)) {
      const ethereumAddresses = [];
      await new Promise((resolve) => {
        fs.createReadStream(ethereumCsvPath)
          .pipe(csv())
          .on('data', (row) => {
            ethereumAddresses.push({
              address: row.address,
              privateKey: row.privateKey,
              currency: 'ethereum',
              used: row.used === 'true' || row.used === '1'
            });
          })
          .on('end', resolve);
      });
      
      // Save to database
      if (ethereumAddresses.length > 0) {
        await CryptoAddress.insertMany(ethereumAddresses);
        console.log(`Migrated ${ethereumAddresses.length} Ethereum addresses to database`);
      }
    } else {
      console.warn('Ethereum CSV file not found at:', ethereumCsvPath);
    }
  } catch (error) {
    console.error('Error migrating crypto addresses:', error);
  }
};
