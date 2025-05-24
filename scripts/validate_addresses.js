/**
 * Script to validate cryptocurrency address assignments
 * Ensures all users have unique addresses and database integrity is maintained
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

// Validate address assignments
async function validateAddressAssignments() {
  try {
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} total users in database`);
    
    // Track addresses to check for duplicates
    const addressCounts = {
      bitcoin: {},
      ethereum: {},
      ubt: {} // For USDT addresses
    };
    
    // Track users with missing addresses
    const usersWithMissingAddresses = [];
    
    // Check each user
    users.forEach(user => {
      // Check for missing addresses
      if (!user.walletAddresses.bitcoin || user.walletAddresses.bitcoin === '') {
        usersWithMissingAddresses.push({
          userId: user._id,
          username: user.username,
          missingType: 'bitcoin'
        });
      } else {
        // Count Bitcoin address occurrences
        const btcAddress = user.walletAddresses.bitcoin;
        addressCounts.bitcoin[btcAddress] = (addressCounts.bitcoin[btcAddress] || 0) + 1;
      }
      
      if (!user.walletAddresses.ethereum || user.walletAddresses.ethereum === '') {
        usersWithMissingAddresses.push({
          userId: user._id,
          username: user.username,
          missingType: 'ethereum'
        });
      } else {
        // Count Ethereum address occurrences
        const ethAddress = user.walletAddresses.ethereum;
        addressCounts.ethereum[ethAddress] = (addressCounts.ethereum[ethAddress] || 0) + 1;
      }
      
      if (!user.walletAddresses.ubt || user.walletAddresses.ubt === '') {
        usersWithMissingAddresses.push({
          userId: user._id,
          username: user.username,
          missingType: 'usdt'
        });
      } else {
        // Count USDT address occurrences
        const usdtAddress = user.walletAddresses.ubt;
        addressCounts.ubt[usdtAddress] = (addressCounts.ubt[usdtAddress] || 0) + 1;
      }
    });
    
    // Find duplicate addresses
    const duplicateAddresses = {
      bitcoin: Object.entries(addressCounts.bitcoin)
        .filter(([address, count]) => count > 1)
        .map(([address, count]) => ({ address, count })),
      ethereum: Object.entries(addressCounts.ethereum)
        .filter(([address, count]) => count > 1)
        .map(([address, count]) => ({ address, count })),
      usdt: Object.entries(addressCounts.ubt)
        .filter(([address, count]) => count > 1)
        .map(([address, count]) => ({ address, count }))
    };
    
    // Generate validation report
    const validationReport = {
      totalUsers: users.length,
      usersWithMissingAddresses: usersWithMissingAddresses,
      duplicateAddresses: duplicateAddresses,
      uniqueAddressCounts: {
        bitcoin: Object.keys(addressCounts.bitcoin).length,
        ethereum: Object.keys(addressCounts.ethereum).length,
        usdt: Object.keys(addressCounts.ubt).length
      },
      isValid: usersWithMissingAddresses.length === 0 && 
               duplicateAddresses.bitcoin.length === 0 && 
               duplicateAddresses.ethereum.length === 0 && 
               duplicateAddresses.usdt.length === 0
    };
    
    // Save validation report
    fs.writeFileSync(
      path.join(__dirname, 'validation_report.json'),
      JSON.stringify(validationReport, null, 2)
    );
    
    // Log validation results
    console.log('Validation Results:');
    console.log(`Total users: ${validationReport.totalUsers}`);
    console.log(`Users with missing addresses: ${validationReport.usersWithMissingAddresses.length}`);
    console.log(`Duplicate Bitcoin addresses: ${validationReport.duplicateAddresses.bitcoin.length}`);
    console.log(`Duplicate Ethereum addresses: ${validationReport.duplicateAddresses.ethereum.length}`);
    console.log(`Duplicate USDT addresses: ${validationReport.duplicateAddresses.usdt.length}`);
    console.log(`Unique Bitcoin addresses: ${validationReport.uniqueAddressCounts.bitcoin}`);
    console.log(`Unique Ethereum addresses: ${validationReport.uniqueAddressCounts.ethereum}`);
    console.log(`Unique USDT addresses: ${validationReport.uniqueAddressCounts.usdt}`);
    console.log(`Overall validation status: ${validationReport.isValid ? 'PASSED' : 'FAILED'}`);
    
    return validationReport;
  } catch (error) {
    console.error('Error validating address assignments:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Connect to database
    await connectToDatabase();
    
    // Validate address assignments
    const validationReport = await validateAddressAssignments();
    
    // Disconnect from database
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    return {
      success: true,
      isValid: validationReport.isValid,
      report: validationReport
    };
  } catch (error) {
    console.error('Error in main function:', error);
    
    // Ensure database connection is closed
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the script
main()
  .then(result => console.log('Result:', result))
  .catch(err => console.error('Unhandled error:', err));
