// Script to import ETH addresses from JSON file
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CryptoAddress from '../models/CryptoAddress.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://a7a5096:MM00nngg2@cluster0hsit.xelat83.mongodb.net/hsit_app?retryWrites=true&w=majority&appName=Cluster0HSIT';

// Function to import ETH addresses
async function importEthAddresses(filePath) {
  try {
    // Read the JSON file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the JSON content
    const jsonData = JSON.parse(fileContent);
    
    // Extract Ethereum addresses
    const ethereumAddresses = jsonData.ethereum || [];
    
    if (ethereumAddresses.length === 0) {
      console.log('No Ethereum addresses found in the file.');
      return;
    }
    
    console.log(`Found ${ethereumAddresses.length} Ethereum addresses to import.`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Import addresses
    let imported = 0;
    let duplicates = 0;
    let errors = [];
    
    for (const address of ethereumAddresses) {
      try {
        // Check if address already exists
        const existingAddress = await CryptoAddress.findOne({ address });
        
        if (existingAddress) {
          console.log(`Address ${address} already exists. Skipping.`);
          duplicates++;
          continue;
        }
        
        // Create new address document
        await CryptoAddress.create({
          address,
          currency: 'ethereum',
          used: false,
          isActive: true,
          createdAt: new Date()
        });
        
        imported++;
        console.log(`Imported address: ${address}`);
      } catch (error) {
        console.error(`Error importing address ${address}:`, error.message);
        errors.push({ address, error: error.message });
      }
    }
    
    // Print summary
    console.log('\nImport Summary:');
    console.log(`Total addresses: ${ethereumAddresses.length}`);
    console.log(`Successfully imported: ${imported}`);
    console.log(`Duplicates skipped: ${duplicates}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nError details:');
      errors.forEach(err => {
        console.log(`- ${err.address}: ${err.error}`);
      });
    }
    
  } catch (error) {
    console.error('Error during import process:', error);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Export the function
export default importEthAddresses;
