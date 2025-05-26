import mongoose from 'mongoose';
import CryptoAddress from '../models/CryptoAddress.js';
import UserAddress from '../models/UserAddress.js';
import User from '../models/User.js';

/**
 * Service for managing crypto address assignments
 */
class AddressAssignmentService {
  /**
   * Assign crypto addresses to a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Assigned addresses
   */
  async assignAddressesToUser(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Check if user already has addresses assigned
      let userAddress = await UserAddress.findOne({ userId }).session(session);
      
      // If user already has addresses, return them
      if (userAddress) {
        await session.commitTransaction();
        session.endSession();
        
        return {
          BTC: userAddress.addresses.BTC?.address,
          ETH: userAddress.addresses.ETH?.address,
          USDT: userAddress.addresses.USDT?.address
        };
      }
      
      // Find available addresses for each currency
      const btcAddress = await this.findAndReserveAddress('BTC', userId, session);
      const ethAddress = await this.findAndReserveAddress('ETH', userId, session);
      const usdtAddress = await this.findAndReserveAddress('USDT', userId, session);
      
      if (!btcAddress || !ethAddress || !usdtAddress) {
        await session.abortTransaction();
        session.endSession();
        throw new Error('Not enough addresses available for assignment');
      }
      
      // Create user address record
      userAddress = new UserAddress({
        userId,
        addresses: {
          BTC: {
            address: btcAddress.address,
            assignedAt: new Date(),
            isActive: true
          },
          ETH: {
            address: ethAddress.address,
            assignedAt: new Date(),
            isActive: true
          },
          USDT: {
            address: usdtAddress.address,
            assignedAt: new Date(),
            isActive: true
          }
        },
        totalAssigned: 3
      });
      
      await userAddress.save({ session });
      
      // Update user model with wallet addresses
      await User.findByIdAndUpdate(
        userId,
        {
          walletAddresses: {
            bitcoin: btcAddress.address,
            ethereum: ethAddress.address,
            ubt: usdtAddress.address
          }
        },
        { session }
      );
      
      await session.commitTransaction();
      session.endSession();
      
      return {
        BTC: btcAddress.address,
        ETH: ethAddress.address,
        USDT: usdtAddress.address
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * Find an available address and reserve it for a user
   * @param {string} currency - Currency type
   * @param {string} userId - User ID
   * @param {mongoose.ClientSession} session - Mongoose session
   * @returns {Promise<Object>} - Reserved address
   */
  async findAndReserveAddress(currency, userId, session) {
    // Find an available address with a write lock
    const address = await CryptoAddress.findOneAndUpdate(
      {
        currency,
        isAssigned: false,
        isActive: true
      },
      {
        isAssigned: true,
        assignedTo: userId,
        assignedAt: new Date()
      },
      {
        new: true,
        session,
        sort: { createdAt: 1 }
      }
    );
    
    return address;
  }
  
  /**
   * Get addresses for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - User's addresses
   */
  async getUserAddresses(userId) {
    // First check UserAddress collection
    const userAddress = await UserAddress.findOne({ userId });
    
    if (userAddress) {
      return {
        BTC: userAddress.addresses.BTC?.address,
        ETH: userAddress.addresses.ETH?.address,
        USDT: userAddress.addresses.USDT?.address
      };
    }
    
    // If not found, check User model
    const user = await User.findById(userId);
    
    if (user && user.walletAddresses) {
      return {
        BTC: user.walletAddresses.bitcoin,
        ETH: user.walletAddresses.ethereum,
        USDT: user.walletAddresses.ubt
      };
    }
    
    // If still not found, assign new addresses
    return this.assignAddressesToUser(userId);
  }
  
  /**
   * Verify that an address belongs to a user
   * @param {string} address - Crypto address
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} - Whether address belongs to user
   */
  async verifyAddressBelongsToUser(address, userId) {
    // Check in CryptoAddress collection
    const cryptoAddress = await CryptoAddress.findOne({
      address,
      assignedTo: userId,
      isAssigned: true
    });
    
    if (cryptoAddress) {
      return true;
    }
    
    // Check in UserAddress collection
    const userAddress = await UserAddress.findOne({ userId });
    
    if (userAddress) {
      return (
        userAddress.addresses.BTC?.address === address ||
        userAddress.addresses.ETH?.address === address ||
        userAddress.addresses.USDT?.address === address
      );
    }
    
    // Check in User model
    const user = await User.findById(userId);
    
    if (user && user.walletAddresses) {
      return (
        user.walletAddresses.bitcoin === address ||
        user.walletAddresses.ethereum === address ||
        user.walletAddresses.ubt === address
      );
    }
    
    return false;
  }
}

export default new AddressAssignmentService();
