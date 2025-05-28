import mongoose from 'mongoose';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import config from '../config/config.js';

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB Connected...');
  migrateAddressAssignments();
}).catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

/**
 * Migrate address assignments to fix issues
 */
async function migrateAddressAssignments() {
  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    console.log('Starting address assignment migration...');
    
    // Step 1: Reset all address assignments
    console.log('Resetting all address assignments...');
    
    // Reset all CryptoAddress documents
    await CryptoAddress.updateMany(
      {},
      { 
        isAssigned: false,
        $unset: { assignedTo: "", assignedAt: "" }
      },
      { session }
    );
    
    // Reset all User wallet addresses
    await User.updateMany(
      {},
      { $set: { walletAddresses: {} } },
      { session }
    );
    
    console.log('All address assignments have been reset.');
    
    // Step 2: Re-assign addresses to users one by one
    console.log('Re-assigning addresses to users...');
    
    const users = await User.find({}).session(session);
    console.log(`Found ${users.length} users to process.`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        // Initialize walletAddresses if it doesn't exist
        if (!user.walletAddresses) {
          user.walletAddresses = {};
        }
        
        // Assign Bitcoin address
        const bitcoinAddress = await CryptoAddress.findOneAndUpdate(
          { 
            currency: 'BTC',
            isAssigned: false,
            isActive: true
          },
          { 
            isAssigned: true, 
            assignedTo: user._id, 
            assignedAt: new Date() 
          },
          { 
            new: true,
            session
          }
        );
        
        if (bitcoinAddress) {
          user.walletAddresses.bitcoin = bitcoinAddress.address;
        } else {
          console.error(`No available Bitcoin address for user ${user._id}`);
        }
        
        // Assign Ethereum address
        const ethereumAddress = await CryptoAddress.findOneAndUpdate(
          { 
            currency: 'ETH',
            isAssigned: false,
            isActive: true
          },
          { 
            isAssigned: true, 
            assignedTo: user._id, 
            assignedAt: new Date() 
          },
          { 
            new: true,
            session
          }
        );
        
        if (ethereumAddress) {
          user.walletAddresses.ethereum = ethereumAddress.address;
        } else {
          console.error(`No available Ethereum address for user ${user._id}`);
        }
        
        // Assign USDT address
        const usdtAddress = await CryptoAddress.findOneAndUpdate(
          { 
            currency: 'USDT',
            isAssigned: false,
            isActive: true
          },
          { 
            isAssigned: true, 
            assignedTo: user._id, 
            assignedAt: new Date() 
          },
          { 
            new: true,
            session
          }
        );
        
        if (usdtAddress) {
          user.walletAddresses.usdt = usdtAddress.address;
        } else if (user.walletAddresses.ethereum) {
          // Use Ethereum address for USDT if no dedicated USDT address is available
          user.walletAddresses.usdt = user.walletAddresses.ethereum;
        } else {
          console.error(`No available USDT or Ethereum address for user ${user._id}`);
        }
        
        // Save user with updated addresses
        await user.save({ session });
        successCount++;
      } catch (error) {
        console.error(`Error processing user ${user._id}:`, error);
        errorCount++;
      }
    }
    
    // Step 3: Verify the migration was successful
    console.log('Verifying migration results...');
    
    // Check for any remaining issues
    const duplicateAddresses = await findDuplicateAddresses(session);
    const inconsistencies = await findInconsistencies(session);
    
    if (duplicateAddresses.length > 0 || inconsistencies.length > 0) {
      console.error('Migration verification failed:');
      console.error(`- Duplicate addresses: ${duplicateAddresses.length}`);
      console.error(`- Inconsistencies: ${inconsistencies.length}`);
      
      // Abort transaction
      await session.abortTransaction();
      session.endSession();
      
      console.error('Migration aborted due to verification failure.');
      process.exit(1);
    }
    
    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total users processed: ${users.length}`);
    console.log(`Successful assignments: ${successCount}`);
    console.log(`Failed assignments: ${errorCount}`);
    console.log('Migration completed successfully!');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Migration complete.');
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Error during migration:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

/**
 * Find duplicate address assignments
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Array} - List of duplicate assignments
 */
async function findDuplicateAddresses(session) {
  const duplicates = [];
  
  // Check for Bitcoin addresses assigned to multiple users
  const bitcoinAddresses = await CryptoAddress.find({ 
    currency: 'BTC',
    isAssigned: true
  }).session(session);
  
  for (const address of bitcoinAddresses) {
    const users = await User.find({
      'walletAddresses.bitcoin': address.address
    }).session(session);
    
    if (users.length > 1) {
      duplicates.push({
        address: address.address,
        currency: 'BTC',
        userCount: users.length,
        userIds: users.map(u => u._id)
      });
    }
  }
  
  // Check for Ethereum addresses assigned to multiple users
  const ethereumAddresses = await CryptoAddress.find({ 
    currency: 'ETH',
    isAssigned: true
  }).session(session);
  
  for (const address of ethereumAddresses) {
    const users = await User.find({
      'walletAddresses.ethereum': address.address
    }).session(session);
    
    if (users.length > 1) {
      duplicates.push({
        address: address.address,
        currency: 'ETH',
        userCount: users.length,
        userIds: users.map(u => u._id)
      });
    }
  }
  
  // Check for USDT addresses assigned to multiple users
  const usdtAddresses = await CryptoAddress.find({ 
    currency: 'USDT',
    isAssigned: true
  }).session(session);
  
  for (const address of usdtAddresses) {
    const users = await User.find({
      'walletAddresses.usdt': address.address
    }).session(session);
    
    if (users.length > 1) {
      duplicates.push({
        address: address.address,
        currency: 'USDT',
        userCount: users.length,
        userIds: users.map(u => u._id)
      });
    }
  }
  
  return duplicates;
}

/**
 * Find inconsistencies between User and CryptoAddress collections
 * @param {mongoose.ClientSession} session - MongoDB session
 * @returns {Array} - List of inconsistencies
 */
async function findInconsistencies(session) {
  const inconsistencies = [];
  
  // Get all users with wallet addresses
  const users = await User.find({ 
    'walletAddresses': { $exists: true } 
  }).session(session);
  
  for (const user of users) {
    // Skip users without wallet addresses
    if (!user.walletAddresses) continue;
    
    // Check Bitcoin address
    if (user.walletAddresses.bitcoin) {
      const bitcoinAddress = await CryptoAddress.findOne({
        address: user.walletAddresses.bitcoin,
        currency: 'BTC'
      }).session(session);
      
      if (!bitcoinAddress) {
        inconsistencies.push({
          userId: user._id,
          currency: 'BTC',
          address: user.walletAddresses.bitcoin,
          issue: 'Address not found in CryptoAddress collection'
        });
      } else if (!bitcoinAddress.isAssigned) {
        inconsistencies.push({
          userId: user._id,
          currency: 'BTC',
          address: user.walletAddresses.bitcoin,
          issue: 'Address not marked as assigned in CryptoAddress collection'
        });
      } else if (!bitcoinAddress.assignedTo || !bitcoinAddress.assignedTo.equals(user._id)) {
        inconsistencies.push({
          userId: user._id,
          currency: 'BTC',
          address: user.walletAddresses.bitcoin,
          issue: 'Address assigned to different user in CryptoAddress collection',
          assignedTo: bitcoinAddress.assignedTo
        });
      }
    }
    
    // Check Ethereum address
    if (user.walletAddresses.ethereum) {
      const ethereumAddress = await CryptoAddress.findOne({
        address: user.walletAddresses.ethereum,
        currency: 'ETH'
      }).session(session);
      
      if (!ethereumAddress) {
        inconsistencies.push({
          userId: user._id,
          currency: 'ETH',
          address: user.walletAddresses.ethereum,
          issue: 'Address not found in CryptoAddress collection'
        });
      } else if (!ethereumAddress.isAssigned) {
        inconsistencies.push({
          userId: user._id,
          currency: 'ETH',
          address: user.walletAddresses.ethereum,
          issue: 'Address not marked as assigned in CryptoAddress collection'
        });
      } else if (!ethereumAddress.assignedTo || !ethereumAddress.assignedTo.equals(user._id)) {
        inconsistencies.push({
          userId: user._id,
          currency: 'ETH',
          address: user.walletAddresses.ethereum,
          issue: 'Address assigned to different user in CryptoAddress collection',
          assignedTo: ethereumAddress.assignedTo
        });
      }
    }
    
    // Check USDT address (only if different from Ethereum address)
    if (user.walletAddresses.usdt && user.walletAddresses.usdt !== user.walletAddresses.ethereum) {
      const usdtAddress = await CryptoAddress.findOne({
        address: user.walletAddresses.usdt,
        currency: 'USDT'
      }).session(session);
      
      if (!usdtAddress) {
        inconsistencies.push({
          userId: user._id,
          currency: 'USDT',
          address: user.walletAddresses.usdt,
          issue: 'Address not found in CryptoAddress collection'
        });
      } else if (!usdtAddress.isAssigned) {
        inconsistencies.push({
          userId: user._id,
          currency: 'USDT',
          address: user.walletAddresses.usdt,
          issue: 'Address not marked as assigned in CryptoAddress collection'
        });
      } else if (!usdtAddress.assignedTo || !usdtAddress.assignedTo.equals(user._id)) {
        inconsistencies.push({
          userId: user._id,
          currency: 'USDT',
          address: user.walletAddresses.usdt,
          issue: 'Address assigned to different user in CryptoAddress collection',
          assignedTo: usdtAddress.assignedTo
        });
      }
    }
  }
  
  return inconsistencies;
}
