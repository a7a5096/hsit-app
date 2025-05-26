import mongoose from 'mongoose';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import UserAddress from '../models/UserAddress.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Migrate address data from User model to CryptoAddress and UserAddress collections
 */
async function migrateAddressData() {
  try {
    console.log('Starting address data migration...');
    
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);
    
    let migratedCount = 0;
    
    for (const user of users) {
      // Skip users without wallet addresses
      if (!user.walletAddresses || 
          !user.walletAddresses.bitcoin || 
          !user.walletAddresses.ethereum || 
          !user.walletAddresses.ubt) {
        console.log(`Skipping user ${user._id} - missing wallet addresses`);
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
        }
        
        await session.commitTransaction();
        migratedCount++;
        console.log(`Migrated addresses for user ${user._id}`);
      } catch (error) {
        await session.abortTransaction();
        console.error(`Error migrating user ${user._id}:`, error);
      } finally {
        session.endSession();
      }
    }
    
    console.log(`Migration completed. Migrated ${migratedCount} users.`);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Export the migration function
export default migrateAddressData;
