import mongoose from 'mongoose';
import CryptoAddress from '../models/CryptoAddress.js';
import UserAddress from '../models/UserAddress.js';
import User from '../models/User.js';

/**
 * Service for managing crypto address assignments
 */
class AddressAssignmentService {
  /**
   * Assign crypto addresses to a user. USDT address will be the same as ETH address.
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Assigned addresses (BTC, ETH, USDT)
   */
  async assignAddressesToUser(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      let userAddressDoc = await UserAddress.findOne({ userId }).session(session);
      const user = await User.findById(userId).select('+walletAddresses').session(session);

      if (!user) {
        throw new Error('User not found for address assignment.');
      }

      if (userAddressDoc && 
          userAddressDoc.addresses.BTC?.address && 
          userAddressDoc.addresses.ETH?.address && 
          userAddressDoc.addresses.USDT?.address &&
          userAddressDoc.addresses.ETH.address === userAddressDoc.addresses.USDT.address) {
        
        // Ensure primary CryptoAddress entries (BTC, ETH) are correctly marked.
        // USDT uses ETH address, so no separate marking for USDT in CryptoAddress pool needed beyond ETH.
        await this.ensureDistinctAddressesAreMarkedAsAssigned(
          userAddressDoc.addresses.BTC.address,
          userAddressDoc.addresses.ETH.address, // ETH address string
          userId,
          session
        );
        // Ensure User model is synced correctly with ETH address for USDT/UBT field
        await this.syncUserModelAddresses(
          userId,
          userAddressDoc.addresses.BTC.address,
          userAddressDoc.addresses.ETH.address,
          userAddressDoc.addresses.ETH.address, // Pass ETH address as the USDT address
          session
        );
        await session.commitTransaction();
        session.endSession();
        return {
          BTC: userAddressDoc.addresses.BTC.address,
          ETH: userAddressDoc.addresses.ETH.address,
          USDT: userAddressDoc.addresses.ETH.address, // USDT is ETH address
        };
      }

      if (user.walletAddresses && user.walletAddresses.bitcoin && user.walletAddresses.ethereum) {
        let btc = user.walletAddresses.bitcoin;
        let eth = user.walletAddresses.ethereum;
        let usdtForSync = eth; // USDT is now ETH address

        user.walletAddresses.ubt = eth; 

        await this.syncUserAddressCollection(userId, btc, eth, usdtForSync, session);
        await user.save({ session }); 

        await session.commitTransaction();
        session.endSession();
        return { BTC: btc, ETH: eth, USDT: usdtForSync };
      }

      console.log(`Assigning new pooled addresses for user ${userId}`);
      const btcAddressPoolDoc = await this.findAndReserveAddress('bitcoin', userId, session);
      const ethAddressPoolDoc = await this.findAndReserveAddress('ethereum', userId, session);
      
      if (!btcAddressPoolDoc || !ethAddressPoolDoc) {
        throw new Error('Not enough BTC or ETH addresses available in the pool for assignment.');
      }

      const newBtcAddress = btcAddressPoolDoc.address;
      const newEthAddress = ethAddressPoolDoc.address;
      const newUsdtAddress = newEthAddress; 

      userAddressDoc = await UserAddress.findOneAndUpdate(
        { userId },
        {
          $set: {
            userId,
            'addresses.BTC': { address: newBtcAddress, assignedAt: new Date(), isActive: true },
            'addresses.ETH': { address: newEthAddress, assignedAt: new Date(), isActive: true },
            'addresses.USDT': { address: newUsdtAddress, assignedAt: new Date(), isActive: true },
            totalAssigned: 3 
          }
        },
        { upsert: true, new: true, session }
      );
      
      user.walletAddresses = {
        bitcoin: newBtcAddress,
        ethereum: newEthAddress,
        ubt: newUsdtAddress, 
      };
      await user.save({ session });
      
      // findAndReserveAddress already marks BTC and ETH. No separate marking for USDT in CryptoAddress pool needed.
      
      await session.commitTransaction();
      session.endSession();
      
      return {
        BTC: newBtcAddress,
        ETH: newEthAddress,
        USDT: newUsdtAddress,
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      console.error(`Error in assignAddressesToUser for ${userId}:`, error.message, error.stack);
      throw error; 
    }
  }
  
  /**
   * Ensures only the distinct pooled addresses (BTC, ETH) are marked/upserted in CryptoAddress.
   * USDT reuses the ETH address and does not need a separate CryptoAddress entry if address is globally unique.
   */
  async ensureDistinctAddressesAreMarkedAsAssigned(btcAddress, ethAddress, userId, session) {
    const operations = [];
    if (btcAddress) {
      operations.push(CryptoAddress.findOneAndUpdate(
        { address: btcAddress, currency: 'bitcoin' },
        { $set: { assignedTo: userId, assignedAt: new Date(), used: true } },
        { upsert: true, new: true, session }
      ));
    }
    if (ethAddress) {
      operations.push(CryptoAddress.findOneAndUpdate(
        { address: ethAddress, currency: 'ethereum' },
        { $set: { assignedTo: userId, assignedAt: new Date(), used: true } },
        { upsert: true, new: true, session }
      ));
    }
    // No operation for USDT here as it shares the ETH address, and its CryptoAddress entry is the ETH one.
    await Promise.all(operations);
  }
  
  async syncUserModelAddresses(userId, btcAddress, ethAddress, usdtAddressForUserUbtField, session) {
    // usdtAddressForUserUbtField is the ETH address string.
    await User.findByIdAndUpdate(
      userId,
      {
        $set: { 
          'walletAddresses.bitcoin': btcAddress,
          'walletAddresses.ethereum': ethAddress,
          'walletAddresses.ubt': usdtAddressForUserUbtField, 
        }
      },
      { session, new: true } 
    );
  }
  
  async findAndReserveAddress(currency, userId, session) {
    const addressDoc = await CryptoAddress.findOneAndUpdate(
      { currency, used: false, assignedTo: null },
      { $set: { used: true, assignedTo: userId, assignedAt: new Date() } },
      { new: true, session, sort: { createdAt: 1 } }
    );
    if (!addressDoc) {
        console.warn(`POOL EMPTY: No available addresses in pool for currency: ${currency}`);
    }
    return addressDoc; 
  }
  
  async getUserAddresses(userId) {
    try {
        const user = await User.findById(userId).select('+walletAddresses');
        if (!user) {
            throw new Error("User not found in getUserAddresses.");
        }

        const userAddressDoc = await UserAddress.findOne({ userId });
        if (userAddressDoc && 
            userAddressDoc.addresses.BTC?.address && 
            userAddressDoc.addresses.ETH?.address &&
            userAddressDoc.addresses.USDT?.address &&
            userAddressDoc.addresses.ETH.address === userAddressDoc.addresses.USDT.address) {
            return {
                BTC: userAddressDoc.addresses.BTC.address,
                ETH: userAddressDoc.addresses.ETH.address,
                USDT: userAddressDoc.addresses.USDT.address,
            };
        }

        if (user.walletAddresses && user.walletAddresses.bitcoin && user.walletAddresses.ethereum) {
            const btc = user.walletAddresses.bitcoin;
            const eth = user.walletAddresses.ethereum;
            const usdt = eth; 

            if (user.walletAddresses.ubt !== eth) {
                console.log(`Syncing user ${userId}: ubt field in User model will be updated to ETH address for USDT.`);
                const session = await mongoose.startSession();
                await session.withTransaction(async () => {
                    // Update User model first
                    await User.updateOne( // Use updateOne for targeted field update
                        { _id: userId }, 
                        { $set: { 'walletAddresses.ubt': eth } }, 
                        { session }
                    );
                    // Then sync UserAddress collection, which internally calls ensureDistinctAddressesAreMarkedAsAssigned
                    await this.syncUserAddressCollection(userId, btc, eth, usdt, session);
                });
                session.endSession();
            }
            return { BTC: btc, ETH: eth, USDT: usdt };
        }

        console.log(`No complete or consistent addresses found for user ${userId}, attempting fresh assignment.`);
        return this.assignAddressesToUser(userId);

    } catch (error) {
        console.error(`Error in getUserAddresses for ${userId}: ${error.message}`, error.stack);
        throw error;
    }
  }
  
  async syncUserAddressCollection(userId, btcAddress, ethAddress, usdtAddress, session) {
    // usdtAddress parameter here is the ETH address string.
    await UserAddress.findOneAndUpdate(
      { userId },
      {
        $set: {
            userId,
            'addresses.BTC': { address: btcAddress, assignedAt: new Date(), isActive: true },
            'addresses.ETH': { address: ethAddress, assignedAt: new Date(), isActive: true },
            'addresses.USDT': { address: usdtAddress, assignedAt: new Date(), isActive: true }, 
            totalAssigned: 3,
        }
      },
      { upsert: true, new: true, session }
    );
    
    // Only ensure the distinct pooled addresses (BTC, ETH) are marked.
    // The knowledge that ETH address is also USDT address is handled at User/UserAddress level.
    await this.ensureDistinctAddressesAreMarkedAsAssigned(
      btcAddress,
      ethAddress,
      // No usdtAddress string needed here as we don't mark a separate USDT entity in CryptoAddress pool
      userId,
      session
    );
  }
  
  async verifyAddressBelongsToUser(address, userId) {
    const user = await User.findById(userId).select('+walletAddresses');
    if (!user || !user.walletAddresses) return false;

    // ETH address now serves as USDT address (stored in ubt field)
    if (user.walletAddresses.bitcoin === address || 
        user.walletAddresses.ethereum === address || // Check against ETH
        user.walletAddresses.ubt === address) { // Check against ubt (which is ETH for USDT)
        return true;
    }
    
    const userAddressDoc = await UserAddress.findOne({ userId });
    if (userAddressDoc) {
      return (
        userAddressDoc.addresses.BTC?.address === address ||
        userAddressDoc.addresses.ETH?.address === address || // Check against ETH
        userAddressDoc.addresses.USDT?.address === address  // Check against USDT (which is ETH)
      );
    }
    return false;
  }
}

export default new AddressAssignmentService();
