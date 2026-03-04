import mongoose from 'mongoose';
import CryptoAddress from '../models/CryptoAddress.js';
import UserAddress from '../models/UserAddress.js';
import User from '../models/User.js';
import keyManagementService from './keyManagementService.js';

/**
 * Service for managing crypto address assignments
 */
class AddressAssignmentService {
  /**
   * Assign crypto addresses to a user. USDT/UBT address will be the same as ETH address.
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Assigned addresses (ETH, USDT, UBT)
   */
  async assignAddressesToUser(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error('User not found for address assignment.');

      // Check if user already has an Ethereum address assigned
      if (user.walletAddresses && user.walletAddresses.ethereum) {
        await session.commitTransaction();
        session.endSession();
        return {
          ETH: user.walletAddresses.ethereum,
          USDT: user.walletAddresses.ethereum,
          UBT: user.walletAddresses.ethereum
        };
      }

      console.log(`Assigning new Ethereum address for user ${userId}`);
      const addressDoc = await keyManagementService.assignFromPool(userId, session);
      const newEthAddress = addressDoc.address;

      // Update User model
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            'walletAddresses.ethereum': newEthAddress,
            'walletAddresses.ubt': newEthAddress,
            'walletAddresses.usdt': newEthAddress
          },
          $unset: { 'walletAddresses.bitcoin': "" }
        },
        { session }
      );

      // Update UserAddress collection
      await UserAddress.findOneAndUpdate(
        { userId },
        {
          $set: {
            userId,
            'addresses.ETH': { address: newEthAddress, assignedAt: new Date(), isActive: true },
            'addresses.USDT': { address: newEthAddress, assignedAt: new Date(), isActive: true },
            totalAssigned: 2
          },
          $unset: { 'addresses.BTC': "" }
        },
        { upsert: true, session }
      );
      
      await session.commitTransaction();
      session.endSession();
      
      return {
        ETH: newEthAddress,
        USDT: newEthAddress,
        UBT: newEthAddress
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      console.error(`Error in assignAddressesToUser for ${userId}:`, error.message);
      throw error; 
    }
  }
  
  /**
   * Get user's crypto addresses.
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User's addresses
   */
  async getUserAddresses(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found in getUserAddresses.");

        if (user.walletAddresses && user.walletAddresses.ethereum) {
            return {
                ETH: user.walletAddresses.ethereum,
                USDT: user.walletAddresses.ethereum,
                UBT: user.walletAddresses.ethereum
            };
        }

        // If no addresses, assign new ones
        return this.assignAddressesToUser(userId);
    } catch (error) {
        console.error(`Error in getUserAddresses for ${userId}: ${error.message}`);
        throw error;
    }
  }
  
  /**
   * Verify if an address belongs to a user.
   * @param {string} address - Crypto address
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async verifyAddressBelongsToUser(address, userId) {
    const user = await User.findById(userId);
    if (!user || !user.walletAddresses) return false;

    const normalizedAddress = address.toLowerCase();
    const userEthAddress = user.walletAddresses.ethereum ? user.walletAddresses.ethereum.toLowerCase() : null;

    return normalizedAddress === userEthAddress;
  }
}

export default new AddressAssignmentService();
