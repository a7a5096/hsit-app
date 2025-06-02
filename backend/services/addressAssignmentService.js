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

      // Scenario 1: UserAddress record exists and is complete (BTC, ETH, and USDT points to ETH)
      if (userAddressDoc && 
          userAddressDoc.addresses.BTC?.address && 
          userAddressDoc.addresses.ETH?.address && 
          userAddressDoc.addresses.USDT?.address &&
          userAddressDoc.addresses.ETH.address === userAddressDoc.addresses.USDT.address) {
        // Ensure linked CryptoAddress entries are correctly marked and User model is synced
        await this.ensureAddressesAreMarkedAsAssigned(
          userAddressDoc.addresses.BTC.address,
          userAddressDoc.addresses.ETH.address,
          userAddressDoc.addresses.USDT.address, // This will be the ETH address
          userId,
          session
        );
        await this.syncUserModelAddresses(
          userId,
          userAddressDoc.addresses.BTC.address,
          userAddressDoc.addresses.ETH.address,
          userAddressDoc.addresses.USDT.address, // This will be the ETH address
          session
        );
        await session.commitTransaction();
        session.endSession();
        return {
          BTC: userAddressDoc.addresses.BTC.address,
          ETH: userAddressDoc.addresses.ETH.address,
          USDT: userAddressDoc.addresses.USDT.address,
        };
      }

      // Scenario 2: User model has addresses (legacy or primary source), sync/create UserAddress
      // And ensure USDT (stored in user.walletAddresses.ubt) is made same as ETH if different,
      // or if ETH exists and ubt (USDT) doesn't, set ubt to ETH.
      if (user.walletAddresses && user.walletAddresses.bitcoin && user.walletAddresses.ethereum) {
        let btc = user.walletAddresses.bitcoin;
        let eth = user.walletAddresses.ethereum;
        let usdt = user.walletAddresses.ethereum; // USDT is now ETH address

        // If legacy ubt field exists and is different, prefer ETH address for USDT.
        // Or if ubt field doesn't exist, it will be set to ETH address.
        user.walletAddresses.ubt = eth; // Ensure ubt field in User model reflects ETH address for USDT

        await this.syncUserAddressCollection(userId, btc, eth, usdt, session); // This will create/update UserAddress
        await user.save({ session }); // Save updated user.walletAddresses.ubt

        await session.commitTransaction();
        session.endSession();
        return { BTC: btc, ETH: eth, USDT: usdt };
      }

      // Scenario 3: No complete addresses found, assign new ones from the pool
      console.log(`Assigning new pooled addresses for user ${userId}`);
      const btcAddressPoolDoc = await this.findAndReserveAddress('BTC', userId, session);
      const ethAddressPoolDoc = await this.findAndReserveAddress('ETH', userId, session);
      
      // Crucial: If we couldn't get both a BTC and ETH address from the pool, assignment fails.
      if (!btcAddressPoolDoc || !ethAddressPoolDoc) {
        throw new Error('Not enough BTC or ETH addresses available in the pool for assignment.');
      }

      const newBtcAddress = btcAddressPoolDoc.address;
      const newEthAddress = ethAddressPoolDoc.address;
      const newUsdtAddress = newEthAddress; // USDT address is the same as ETH address

      // Create or update UserAddress record
      userAddressDoc = await UserAddress.findOneAndUpdate(
        { userId },
        {
          $set: {
            userId,
            'addresses.BTC': { address: newBtcAddress, assignedAt: new Date(), isActive: true },
            'addresses.ETH': { address: newEthAddress, assignedAt: new Date(), isActive: true },
            'addresses.USDT': { address: newUsdtAddress, assignedAt: new Date(), isActive: true },
            totalAssigned: 3 // Counting BTC, ETH, USDT as distinct logical assignments for the user
          }
        },
        { upsert: true, new: true, session }
      );
      
      // Update User model (walletAddresses.ubt will store the ETH/USDT address)
      user.walletAddresses = {
        bitcoin: newBtcAddress,
        ethereum: newEthAddress,
        ubt: newUsdtAddress, // ubt field now stores the ETH address for USDT compatibility
      };
      await user.save({ session });
      
      // ensureAddressesAreMarkedAsAssigned is effectively done by findAndReserveAddress for BTC & ETH.
      // If we want a distinct CryptoAddress entry for USDT (even with same address string),
      // we can call it for USDT separately here, using the ETH address string.
      // This will create a CryptoAddress doc with currency: 'USDT' and address: newEthAddress.
      await CryptoAddress.findOneAndUpdate(
        { address: newEthAddress, currency: 'USDT' }, // Query specifically for a USDT typed entry
        { isAssigned: true, assignedTo: userId, assignedAt: new Date(), isActive: true },
        { upsert: true, new: true, session } // Create if doesn't exist
      );
      // Note: The ETH address itself (currency: 'ETH') was already marked by findAndReserveAddress.

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
      throw error; // Re-throw to be caught by the route handler
    }
  }
  
  async ensureAddressesAreMarkedAsAssigned(btcAddress, ethAddress, usdtAddress, userId, session) {
    const operations = [];
    if (btcAddress) {
      operations.push(CryptoAddress.findOneAndUpdate(
        { address: btcAddress, currency: 'BTC' },
        { $set: { isAssigned: true, assignedTo: userId, assignedAt: new Date(), isActive: true } },
        { upsert: true, new: true, session }
      ));
    }
    if (ethAddress) {
      operations.push(CryptoAddress.findOneAndUpdate(
        { address: ethAddress, currency: 'ETH' },
        { $set: { isAssigned: true, assignedTo: userId, assignedAt: new Date(), isActive: true } },
        { upsert: true, new: true, session }
      ));
    }
    // If usdtAddress is the same as ethAddress, this will create/update a CryptoAddress document
    // with currency 'USDT' and the shared address string.
    if (usdtAddress) {
      operations.push(CryptoAddress.findOneAndUpdate(
        { address: usdtAddress, currency: 'USDT' },
        { $set: { isAssigned: true, assignedTo: userId, assignedAt: new Date(), isActive: true } },
        { upsert: true, new: true, session }
      ));
    }
    await Promise.all(operations);
  }
  
  async syncUserModelAddresses(userId, btcAddress, ethAddress, usdtAddress, session) {
    // Here, usdtAddress is the string that should be stored for USDT, which is now the ETH address.
    // The User model stores this in the 'ubt' field.
    await User.findByIdAndUpdate(
      userId,
      {
        $set: { // Use $set for targeted updates
          'walletAddresses.bitcoin': btcAddress,
          'walletAddresses.ethereum': ethAddress,
          'walletAddresses.ubt': usdtAddress, // ubt field gets the ETH/USDT address
        }
      },
      { session, new: true } // new: true to return the modified document if needed elsewhere
    );
  }
  
  async findAndReserveAddress(currency, userId, session) {
    const addressDoc = await CryptoAddress.findOneAndUpdate(
      { currency, isAssigned: false, isActive: true },
      { $set: { isAssigned: true, assignedTo: userId, assignedAt: new Date() } },
      { new: true, session, sort: { createdAt: 1 } }
    );
    if (!addressDoc) {
        // This is a critical state if the pool is empty for a required currency.
        console.warn(`No available addresses in pool for currency: ${currency}`);
    }
    return addressDoc; // Can be null if no address is found
  }
  
  async getUserAddresses(userId) {
    try {
        const user = await User.findById(userId).select('+walletAddresses');
        if (!user) {
            throw new Error("User not found in getUserAddresses.");
        }

        // Prefer UserAddress if available and complete
        const userAddressDoc = await UserAddress.findOne({ userId });
        if (userAddressDoc && 
            userAddressDoc.addresses.BTC?.address && 
            userAddressDoc.addresses.ETH?.address &&
            userAddressDoc.addresses.USDT?.address && /* Ensure USDT exists */
            userAddressDoc.addresses.ETH.address === userAddressDoc.addresses.USDT.address /* Ensure USDT is ETH */
            ) {
            return {
                BTC: userAddressDoc.addresses.BTC.address,
                ETH: userAddressDoc.addresses.ETH.address,
                USDT: userAddressDoc.addresses.USDT.address,
            };
        }

        // If User model has ETH and BTC, derive USDT from ETH and ensure consistency
        if (user.walletAddresses && user.walletAddresses.bitcoin && user.walletAddresses.ethereum) {
            const btc = user.walletAddresses.bitcoin;
            const eth = user.walletAddresses.ethereum;
            const usdt = eth; // USDT is the ETH address

            // If user.walletAddresses.ubt (which stores USDT) is not set or differs, update it
            // This also triggers syncUserAddressCollection to update/create UserAddress doc
            if (user.walletAddresses.ubt !== eth) {
                console.log(`Syncing user ${userId}: ubt field will be updated to ETH address for USDT.`);
                const session = await mongoose.startSession();
                await session.withTransaction(async () => {
                    user.walletAddresses.ubt = eth;
                    await user.save({ session }); // Save updated user model
                    await this.syncUserAddressCollection(userId, btc, eth, usdt, session);
                });
                session.endSession();
            }
            return { BTC: btc, ETH: eth, USDT: usdt };
        }

        // Fallback: If no consistent addresses found, try to assign new ones.
        console.log(`No complete or consistent addresses found for user ${userId}, attempting fresh assignment.`);
        return this.assignAddressesToUser(userId);

    } catch (error) {
        console.error(`Error in getUserAddresses for ${userId}: ${error.message}`, error.stack);
        // Depending on how critical this is, you might re-throw or return an error structure
        // For now, re-throwing so the route handler can decide on the HTTP response.
        throw error;
    }
  }
  
  async syncUserAddressCollection(userId, btcAddress, ethAddress, usdtAddress, session) {
    // usdtAddress parameter here is the ETH address string.
    // UserAddress.addresses.USDT.address will store this ETH address.
    await UserAddress.findOneAndUpdate(
      { userId },
      {
        $set: {
            userId,
            'addresses.BTC': { address: btcAddress, assignedAt: new Date(), isActive: true },
            'addresses.ETH': { address: ethAddress, assignedAt: new Date(), isActive: true },
            'addresses.USDT': { address: usdtAddress, assignedAt: new Date(), isActive: true }, // USDT address is ETH address
            totalAssigned: 3,
        }
      },
      { upsert: true, new: true, session }
    );
    
    // Mark these actual addresses in the CryptoAddress pool
    // This will create a 'USDT' typed CryptoAddress entry with the ETH address if it doesn't exist
    await this.ensureAddressesAreMarkedAsAssigned(
      btcAddress,
      ethAddress,
      usdtAddress, // This is the ETH address string, will create/update a USDT typed CryptoAddress
      userId,
      session
    );
  }
  
  async verifyAddressBelongsToUser(address, userId) {
    const user = await User.findById(userId).select('+walletAddresses');
    if (!user || !user.walletAddresses) return false;

    if (user.walletAddresses.bitcoin === address || 
        user.walletAddresses.ethereum === address ||
        user.walletAddresses.ubt === address) { // ubt field (now ETH/USDT address) is checked
        return true;
    }
    
    // Optional: Check UserAddress collection as a secondary source if needed,
    // but User model should be the primary source of truth after sync.
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
