/**
 * Script to assign unique cryptocurrency addresses to users
 * This script handles both new user registration and existing users without addresses
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import User model
import User from '../backend/models/User.js';

// Path to parsed addresses
const ADDRESSES_FILE = path.join(__dirname, 'parsed_addresses.json');

// Track assigned addresses to prevent duplicates
const assignedAddresses = {
  bitcoin: new Set(),
  ethereum: new Set(),
  usdt: new Set()
};

// Load parsed addresses
async function loadAddresses() {
  try {
    const data = fs.readFileSync(ADDRESSES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading addresses:', error);
    throw error;
  }
}

// Mark addresses as assigned based on existing users
async function markExistingAssignedAddresses() {
  try {
    const users = await User.find({
      $or: [
        { 'walletAddresses.bitcoin': { $ne: '' } },
        { 'walletAddresses.ethereum': { $ne: '' } },
        { 'walletAddresses.ubt': { $ne: '' } }
      ]
    });

    console.log(`Found ${users.length} users with existing addresses`);

    users.forEach(user => {
      if (user.walletAddresses.bitcoin) {
        assignedAddresses.bitcoin.add(user.walletAddresses.bitcoin);
      }
      if (user.walletAddresses.ethereum) {
        assignedAddresses.ethereum.add(user.walletAddresses.ethereum);
      }
      if (user.walletAddresses.ubt) {
        assignedAddresses.usdt.add(user.walletAddresses.ubt);
      }
    });

    console.log(`Marked ${assignedAddresses.bitcoin.size} Bitcoin addresses as already assigned`);
    console.log(`Marked ${assignedAddresses.ethereum.size} Ethereum addresses as already assigned`);
    console.log(`Marked ${assignedAddresses.usdt.size} USDT addresses as already assigned`);
  } catch (error) {
    console.error('Error marking existing assigned addresses:', error);
    throw error;
  }
}

// Get next available address for a cryptocurrency type
function getNextAvailableAddress(addresses, type) {
  const availableAddresses = addresses[type].filter(addr => !assignedAddresses[type].has(addr));
  
  if (availableAddresses.length === 0) {
    throw new Error(`No more available ${type} addresses`);
  }
  
  const nextAddress = availableAddresses[0];
  assignedAddresses[type].add(nextAddress);
  
  return nextAddress;
}

// Assign addresses to a user
async function assignAddressesToUser(user, addresses) {
  try {
    // Get new addresses
    const bitcoinAddress = getNextAvailableAddress(addresses, 'bitcoin');
    const ethereumAddress = getNextAvailableAddress(addresses, 'ethereum');
    const usdtAddress = getNextAvailableAddress(addresses, 'usdt');
    
    // Use updateOne to bypass validation and only update wallet addresses
    await User.updateOne(
      { _id: user._id },
      { 
        $set: {
          'walletAddresses.bitcoin': bitcoinAddress,
          'walletAddresses.ethereum': ethereumAddress,
          'walletAddresses.ubt': usdtAddress
        }
      }
    );
    
    console.log(`Updated addresses for user ${user._id || user.username || 'unknown'}`);
    return {
      _id: user._id,
      bitcoin: bitcoinAddress,
      ethereum: ethereumAddress,
      usdt: usdtAddress
    };
  } catch (error) {
    console.error(`Error assigning addresses to user ${user._id}:`, error);
    throw error;
  }
}

// Assign addresses to all existing users
async function assignAddressesToExistingUsers(addresses) {
  try {
    // Get all users, regardless of whether they have addresses or not
    const users = await User.find({});
    
    console.log(`Found ${users.length} total users in database`);
    
    let updatedCount = 0;
    for (const user of users) {
      await assignAddressesToUser(user, addresses);
      updatedCount++;
    }
    
    console.log(`Successfully assigned addresses to ${updatedCount} existing users`);
    return updatedCount;
  } catch (error) {
    console.error('Error assigning addresses to existing users:', error);
    throw error;
  }
}

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Load addresses
    const addresses = await loadAddresses();
    console.log('Loaded addresses from file');
    
    // Mark existing assigned addresses
    await markExistingAssignedAddresses();
    
    // Assign addresses to existing users without addresses
    const updatedCount = await assignAddressesToExistingUsers(addresses);
    
    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    console.log('Address assignment completed successfully');
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Error in main function:', error);
    
    // Ensure database connection is closed
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    
    return { success: false, error: error.message };
  }
}

// Execute the script
main()
  .then(result => console.log('Result:', result))
  .catch(err => console.error('Unhandled error:', err));
