import mongoose from 'mongoose';
import DepositKey from '../models/DepositKey.js';
import UserAddress from '../models/UserAddress.js';
import User from '../models/User.js';

/**
 * Service for managing crypto address assignments using DepositKey (public/private key pairs)
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

      // Check if user already has assigned addresses in UserAddress
      if (userAddressDoc && 
          userAddressDoc.addresses.BTC?.address && 
          userAddressDoc.addresses.ETH?.address && 
          userAddressDoc.addresses.USDT?.address &&
          userAddressDoc.addresses.ETH.address === userAddressDoc.addresses.USDT.address) {
        
        // Ensure keys are marked as assigned in DepositKey collection
        await this.ensureKeysAreMarkedAsAssigned(
          userAddressDoc.addresses.BTC.address,
          userAddressDoc.addresses.ETH.address, // ETH address
          userId,
          session
        );
        
        // Sync User model
        await this.syncUserModelAddresses(
          userId,
          userAddressDoc.addresses.BTC.address,
          userAddressDoc.addresses.ETH.address,
          userAddressDoc.addresses.ETH.address, // USDT uses ETH address
          session
        );

        await session.commitTransaction();
        session.endSession();
        return {
          BTC: userAddressDoc.addresses.BTC.address,
          ETH: userAddressDoc.addresses.ETH.address,
          USDT: userAddressDoc.addresses.ETH.address,
        };
      }

      // Check if user has addresses in User model (legacy check)
      if (user.walletAddresses && user.walletAddresses.bitcoin && user.walletAddresses.ethereum) {
        let btc = user.walletAddresses.bitcoin;
        let eth = user.walletAddresses.ethereum;
        let usdtForSync = eth; 

        user.walletAddresses.ubt = eth; 

        await this.syncUserAddressCollection(userId, btc, eth, usdtForSync, session);
        await user.save({ session }); 

        await session.commitTransaction();
        session.endSession();
        return { BTC: btc, ETH: eth, USDT: usdtForSync };
      }

      console.log(`Assigning new keys for user ${userId}`);
      
      // Reserve keys from DepositKey pool
      const btcKeyDoc = await this.findAndReserveKey('BTC', userId, session);
      const ethKeyDoc = await this.findAndReserveKey('ETH', userId, session);
      
      if (!btcKeyDoc || !ethKeyDoc) {
        throw new Error('Not enough BTC or ETH keys available in the DepositKey pool.');
      }

      const newBtcAddress = btcKeyDoc.publicAddress;
      const newEthAddress = ethKeyDoc.publicAddress;
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
   * Ensures the assigned keys are marked in DepositKey collection.
   */
  async ensureKeysAreMarkedAsAssigned(btcAddress, ethAddress, userId, session) {
    const operations = [];
    if (btcAddress) {
      operations.push(DepositKey.findOneAndUpdate(
        { publicAddress: btcAddress, currency: 'BTC' },
        { $set: { isAssigned: true, assignedTo: userId, assignedAt: new Date() } },
        { upsert: true, new: true, session }
      ));
    }
    if (ethAddress) {
      operations.push(DepositKey.findOneAndUpdate(
        { publicAddress: ethAddress, currency: 'ETH' },
        { $set: { isAssigned: true, assignedTo: userId, assignedAt: new Date() } },
        { upsert: true, new: true, session }
      ));
    }
    await Promise.all(operations);
  }
  
  async syncUserModelAddresses(userId, btcAddress, ethAddress, usdtAddressForUserUbtField, session) {
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
  
  async findAndReserveKey(currency, userId, session) {
    const keyDoc = await DepositKey.findOneAndUpdate(
      { currency, isAssigned: false },
      { $set: { isAssigned: true, assignedTo: userId, assignedAt: new Date() } },
      { new: true, session, sort: { createdAt: 1 } }
    );
    if (!keyDoc) {
        console.warn(`POOL EMPTY: No available keys in DepositKey pool for currency: ${currency}`);
    }
    return keyDoc; 
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
                    await User.updateOne(
                        { _id: userId }, 
                        { $set: { 'walletAddresses.ubt': eth } }, 
                        { session }
                    );
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
    
    await this.ensureKeysAreMarkedAsAssigned(
      btcAddress,
      ethAddress,
      userId,
      session
    );
  }
  
  async verifyAddressBelongsToUser(address, userId) {
    const user = await User.findById(userId).select('+walletAddresses');
    if (!user || !user.walletAddresses) return false;

    if (user.walletAddresses.bitcoin === address || 
        user.walletAddresses.ethereum === address || 
        user.walletAddresses.ubt === address) { 
        return true;
    }
    
    const userAddressDoc = await UserAddress.findOne({ userId });
    if (userAddressDoc) {
      return (
        userAddressDoc.addresses.BTC?.address === address ||
        userAddressDoc.addresses.ETH?.address === address || 
        userAddressDoc.addresses.USDT?.address === address
      );
    }
    return false;
  }
}

export default new AddressAssignmentService();
