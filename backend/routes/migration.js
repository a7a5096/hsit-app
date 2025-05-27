import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import UserAddress from '../models/UserAddress.js';
import crypto from 'crypto';

const router = express.Router();

// Generate a secure migration token
const MIGRATION_TOKEN = crypto.randomBytes(32).toString('hex');
console.log('Migration endpoint created with token:', MIGRATION_TOKEN);

/**
 * Secure migration endpoint
 * This endpoint requires a valid token and can only be executed once
 */
let migrationCompleted = false;

// @route   POST /api/migration/run
// @desc    Run the address migration
// @access  Protected by token
router.post('/run', async (req, res) => {
  try {
    // Check if migration has already been completed
    if (migrationCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Migration has already been completed'
      });
    }
    
    // Validate token
    const { token } = req.body;
    
    if (!token || token !== MIGRATION_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or missing migration token'
      });
    }
    
    // Run the migration
    const result = await migrateAddressData();
    
    // Mark migration as completed if successful
    if (result.success) {
      migrationCompleted = true;
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Migration endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during migration',
      error: error.message
    });
  }
});

// @route   GET /api/migration/status
// @desc    Check migration status
// @access  Public
router.get('/status', (req, res) => {
  res.json({
    migrationCompleted
  });
});

/**
 * Migrate address data from User model to CryptoAddress and UserAddress collections
 */
async function migrateAddressData() {
  console.log('Starting address data migration...');
  
  try {
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let userDetails = [];
    
    for (const user of users) {
      // Skip users without wallet addresses
      if (!user.walletAddresses || 
          !user.walletAddresses.bitcoin || 
          !user.walletAddresses.ethereum || 
          !user.walletAddresses.ubt) {
        console.log(`Skipping user ${user._id} - missing wallet addresses`);
        skippedCount++;
        userDetails.push({
          userId: user._id,
          status: 'skipped',
          reason: 'missing wallet addresses'
        });
        continue;
      }
      
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Check if addresses already exist in CryptoAddress collection
        const btcExists = await CryptoAddress.findOne({ 
          address: user.walletAddresses.bitcoin 
        }).session(session);
        
        const ethExists = await CryptoAddress.findOne({ 
          address: user.walletAddresses.ethereum 
        }).session(session);
        
        const usdtExists = await CryptoAddress.findOne({ 
          address: user.walletAddresses.ubt 
        }).session(session);
        
        // Create BTC address if it doesn't exist
        if (!btcExists) {
          await CryptoAddress.create([{
            address: user.walletAddresses.bitcoin,
            currency: 'BTC',
            isAssigned: true,
            assignedTo: user._id,
            assignedAt: new Date(),
            isActive: true
          }], { session });
          console.log(`Created BTC address for user ${user._id}`);
        } else if (!btcExists.assignedTo) {
          // Update if it exists but isn't assigned
          await CryptoAddress.findOneAndUpdate(
            { address: user.walletAddresses.bitcoin },
            {
              isAssigned: true,
              assignedTo: user._id,
              assignedAt: new Date()
            },
            { session }
          );
          console.log(`Updated BTC address for user ${user._id}`);
        } else {
          console.log(`BTC address for user ${user._id} already exists and is assigned`);
        }
        
        // Create ETH address if it doesn't exist
        if (!ethExists) {
          await CryptoAddress.create([{
            address: user.walletAddresses.ethereum,
            currency: 'ETH',
            isAssigned: true,
            assignedTo: user._id,
            assignedAt: new Date(),
            isActive: true
          }], { session });
          console.log(`Created ETH address for user ${user._id}`);
        } else if (!ethExists.assignedTo) {
          // Update if it exists but isn't assigned
          await CryptoAddress.findOneAndUpdate(
            { address: user.walletAddresses.ethereum },
            {
              isAssigned: true,
              assignedTo: user._id,
              assignedAt: new Date()
            },
            { session }
          );
          console.log(`Updated ETH address for user ${user._id}`);
        } else {
          console.log(`ETH address for user ${user._id} already exists and is assigned`);
        }
        
        // Create USDT address if it doesn't exist
        if (!usdtExists) {
          await CryptoAddress.create([{
            address: user.walletAddresses.ubt,
            currency: 'USDT',
            isAssigned: true,
            assignedTo: user._id,
            assignedAt: new Date(),
            isActive: true
          }], { session });
          console.log(`Created USDT address for user ${user._id}`);
        } else if (!usdtExists.assignedTo) {
          // Update if it exists but isn't assigned
          await CryptoAddress.findOneAndUpdate(
            { address: user.walletAddresses.ubt },
            {
              isAssigned: true,
              assignedTo: user._id,
              assignedAt: new Date()
            },
            { session }
          );
          console.log(`Updated USDT address for user ${user._id}`);
        } else {
          console.log(`USDT address for user ${user._id} already exists and is assigned`);
        }
        
        // Create or update UserAddress record
        let userAddress = await UserAddress.findOne({ userId: user._id }).session(session);
        
        if (!userAddress) {
          userAddress = new UserAddress({
            userId: user._id,
            addresses: {
              BTC: {
                address: user.walletAddresses.bitcoin,
                assignedAt: new Date(),
                isActive: true
              },
              ETH: {
                address: user.walletAddresses.ethereum,
                assignedAt: new Date(),
                isActive: true
              },
              USDT: {
                address: user.walletAddresses.ubt,
                assignedAt: new Date(),
                isActive: true
              }
            },
            totalAssigned: 3
          });
          
          await userAddress.save({ session });
          console.log(`Created UserAddress record for user ${user._id}`);
        } else {
          console.log(`UserAddress record for user ${user._id} already exists`);
        }
        
        await session.commitTransaction();
        migratedCount++;
        userDetails.push({
          userId: user._id,
          status: 'migrated',
          addresses: {
            BTC: user.walletAddresses.bitcoin,
            ETH: user.walletAddresses.ethereum,
            USDT: user.walletAddresses.ubt
          }
        });
        console.log(`Successfully migrated addresses for user ${user._id}`);
      } catch (error) {
        await session.abortTransaction();
        console.error(`Error migrating user ${user._id}:`, error);
        errorCount++;
        userDetails.push({
          userId: user._id,
          status: 'error',
          error: error.message
        });
      } finally {
        session.endSession();
      }
    }
    
    console.log(`Migration completed.`);
    console.log(`- Migrated: ${migratedCount} users`);
    console.log(`- Skipped: ${skippedCount} users`);
    console.log(`- Errors: ${errorCount} users`);
    
    return {
      success: true,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      details: userDetails
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default router;
