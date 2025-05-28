// Script to fix duplicate index issue in UserAddress collection
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log('.env file not found, using default environment variables');
  dotenv.config();
}

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hsit';

console.log('Connecting to MongoDB...');

const fixDuplicateIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
    
    console.log('Starting index repair process...');
    
    // Get the UserAddress collection
    const db = mongoose.connection.db;
    const collection = db.collection('useraddresses');
    
    // Get all indexes on the collection
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    // Find and drop any duplicate userId indexes
    let duplicateFound = false;
    for (const index of indexes) {
      // Skip the _id index and the unique compound index we want to keep
      if (index.name === '_id_' || (index.key && index.key.userId === 1 && index.unique === true)) {
        console.log(`Keeping index: ${index.name}`);
        continue;
      }
      
      // If there's another index on userId, drop it
      if (index.key && index.key.userId === 1) {
        console.log(`Dropping duplicate index: ${index.name}`);
        await collection.dropIndex(index.name);
        duplicateFound = true;
      }
    }
    
    if (!duplicateFound) {
      console.log('No duplicate indexes found.');
    } else {
      console.log('Duplicate indexes successfully removed.');
    }
    
    // Verify indexes after fix
    const updatedIndexes = await collection.indexes();
    console.log('Updated indexes:', JSON.stringify(updatedIndexes, null, 2));
    
    console.log('Index repair process completed successfully.');
  } catch (error) {
    console.error('Error fixing duplicate indexes:', error);
  } finally {
    // Close MongoDB connection
    if (mongoose.connection) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    process.exit(0);
  }
};

// Run the fix
fixDuplicateIndex();
