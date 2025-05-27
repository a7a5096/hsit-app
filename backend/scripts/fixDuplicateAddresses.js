import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Initialize environment variables
dotenv.config();

// Define __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import and register schemas
import '../models/User.js';
import '../models/CryptoAddress.js';

async function fixDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get model references after connection is established
    const CryptoAddress = mongoose.model('CryptoAddress');
    const User = mongoose.model('User');

    // Check for duplicate assignments
    console.log('Checking for duplicate address assignments...');
    
    // Find addresses assigned to multiple users
    console.log('Finding addresses assigned to multiple users...');
    
    const duplicateBTC = await findDuplicateAssignments('BTC', CryptoAddress, User);
    const duplicateETH = await findDuplicateAssignments('ETH', CryptoAddress, User);
    const duplicateUSDT = await findDuplicateAssignments('USDT', CryptoAddress, User);
    
    console.log(`Found ${duplicateBTC.length} duplicate BTC assignments`);
    console.log(`Found ${duplicateETH.length} duplicate ETH assignments`);
    console.log(`Found ${duplicateUSDT.length} duplicate USDT assignments`);
    
    // Fix duplicate assignments
    let fixedCount = 0;
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Fix BTC duplicates
      for (const dup of duplicateBTC) {
        await fixDuplicateAssignment('BTC', dup, session, CryptoAddress, User);
        fixedCount++;
      }
      
      // Fix ETH duplicates
      for (const dup of duplicateETH) {
        await fixDuplicateAssignment('ETH', dup, session, CryptoAddress, User);
        fixedCount++;
      }
      
      // Fix USDT duplicates
      for (const dup of duplicateUSDT) {
        await fixDuplicateAssignment('USDT', dup, session, CryptoAddress, User);
        fixedCount++;
      }
      
      // Commit transaction
      await session.commitTransaction();
      session.endSession();
      
      console.log(`Fixed ${fixedCount} duplicate assignments`);
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
    
    // Show final stats
    const btcCount = await CryptoAddress.countDocuments({ currency: 'BTC' });
    const ethCount = await CryptoAddress.countDocuments({ currency: 'ETH' });
    const usdtCount = await CryptoAddress.countDocuments({ currency: 'USDT' });
    const assignedCount = await CryptoAddress.countDocuments({ isAssigned: true });
    const unassignedCount = await CryptoAddress.countDocuments({ isAssigned: false });
    
    console.log('Final address statistics:');
    console.log(`Total BTC addresses: ${btcCount}`);
    console.log(`Total ETH addresses: ${ethCount}`);
    console.log(`Total USDT addresses: ${usdtCount}`);
    console.log(`Assigned addresses: ${assignedCount}`);
    console.log(`Unassigned addresses: ${unassignedCount}`);
    
    console.log('Fix completed successfully!');
  } catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Find addresses assigned to multiple users
 * @param {string} currency - Currency type (BTC, ETH, USDT)
 * @param {Model} CryptoAddress - CryptoAddress model
 * @param {Model} User - User model
 * @returns {Array} - Array of duplicate assignments
 */
async function findDuplicateAssignments(currency, CryptoAddress, User) {
  const duplicates = [];
  let userField;
  
  if (currency === 'BTC') {
    userField = 'walletAddresses.bitcoin';
  } else if (currency === 'ETH') {
    userField = 'walletAddresses.ethereum';
  } else if (currency === 'USDT') {
    userField = 'walletAddresses.usdt';
  }
  
  // Get all addresses of this currency
  const addresses = await CryptoAddress.find({ 
    currency,
    isAssigned: true
  });
  
  for (const addr of addresses) {
    // Find users with this address
    const users = await User.find({ [userField]: addr.address });
    
    if (users.length > 1) {
      duplicates.push({
        address: addr.address,
        addressId: addr._id,
        users: users.map(u => ({ 
          userId: u._id,
          username: u.username || u.email
        }))
      });
    }
  }
  
  return duplicates;
}

/**
 * Fix a duplicate address assignment
 * @param {string} currency - Currency type (BTC, ETH, USDT)
 * @param {Object} duplicate - Duplicate assignment info
 * @param {mongoose.ClientSession} session - MongoDB session
 * @param {Model} CryptoAddress - CryptoAddress model
 * @param {Model} User - User model
 */
async function fixDuplicateAssignment(currency, duplicate, session, CryptoAddress, User) {
  console.log(`Fixing duplicate ${currency} address ${duplicate.address} assigned to ${duplicate.users.length} users`);
  
  // Keep the first user's assignment, reassign others
  const keepUser = duplicate.users[0];
  const reassignUsers = duplicate.users.slice(1);
  
  let userField, addressField;
  
  if (currency === 'BTC') {
    userField = 'walletAddresses.bitcoin';
    addressField = 'bitcoin';
  } else if (currency === 'ETH') {
    userField = 'walletAddresses.ethereum';
    addressField = 'ethereum';
  } else if (currency === 'USDT') {
    userField = 'walletAddresses.usdt';
    addressField = 'usdt';
  }
  
  // Update the address in CryptoAddress collection to be assigned to the first user
  await CryptoAddress.findByIdAndUpdate(
    duplicate.addressId,
    { 
      isAssigned: true,
      assignedTo: keepUser.userId,
      assignedAt: new Date()
    },
    { session }
  );
  
  // Reassign other users
  for (const user of reassignUsers) {
    // Find a new unassigned address
    const newAddress = await CryptoAddress.findOneAndUpdate(
      { 
        currency,
        isAssigned: false,
        isActive: true
      },
      { 
        isAssigned: true,
        assignedTo: user.userId,
        assignedAt: new Date()
      },
      { 
        new: true,
        session
      }
    );
    
    if (newAddress) {
      // Update user with new address
      const updateObj = {};
      updateObj[`walletAddresses.${addressField}`] = newAddress.address;
      
      await User.findByIdAndUpdate(
        user.userId,
        { $set: updateObj },
        { session }
      );
      
      console.log(`Reassigned user ${user.username} from ${duplicate.address} to ${newAddress.address}`);
    } else {
      console.warn(`No available ${currency} address to reassign user ${user.username}`);
    }
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  fixDuplicates();
}

export default fixDuplicates;
