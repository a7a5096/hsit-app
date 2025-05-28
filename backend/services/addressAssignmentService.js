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
      // Check if user already has addresses assigned in UserAddress collection
      let userAddress = await UserAddress.findOne({ userId }).session(session);
      
      // If user already has addresses in UserAddress, return them
      if (userAddress && 
          userAddress.addresses.BTC?.address && 
          userAddress.addresses.ETH?.address && 
          userAddress.addresses.USDT?.address) {
        
        // Ensure addresses are also marked as assigned in CryptoAddress collection
        await this.ensureAddressesAreMarkedAsAssigned(
          userAddress.addresses.BTC.address,
          userAddress.addresses.ETH.address,
          userAddress.addresses.USDT.address,
          userId,
          session
        );
        
        // Ensure User model has the same addresses
        await this.syncUserModelAddresses(
          userId,
          userAddress.addresses.BTC.address,
          userAddress.addresses.ETH.address,
          userAddress.addresses.USDT.address,
          session
        );
        
        await session.commitTransaction();
        session.endSession();
        
        return {
          BTC: userAddress.addresses.BTC.address,
          ETH: userAddress.addresses.ETH.address,
          USDT: userAddress.addresses.USDT.address
        };
      }
      
      // Check if user has addresses in User model
      const user = await User.findById(userId).session(session);
      if (user && 
          user.walletAddresses && 
          user.walletAddresses.bitcoin && 
          user.walletAddresses.ethereum && 
          user.walletAddresses.ubt) {
        
        // Create or update UserAddress record
        if (!userAddress) {
          userAddress = new UserAddress({
            userId,
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
        } else {
          // Update existing UserAddress record
          userAddress.addresses.BTC = {
            address: user.walletAddresses.bitcoin,
            assignedAt: new Date(),
            isActive: true
          };
          userAddress.addresses.ETH = {
            address: user.walletAddresses.ethereum,
            assignedAt: new Date(),
            isActive: true
          };
          userAddress.addresses.USDT = {
            address: user.walletAddresses.ubt,
            assignedAt: new Date(),
            isActive: true
          };
          userAddress.totalAssigned = 3;
          
          await userAddress.save({ session });
        }
        
        // Ensure addresses are also marked as assigned in CryptoAddress collection
        await this.ensureAddressesAreMarkedAsAssigned(
          user.walletAddresses.bitcoin,
          user.walletAddresses.ethereum,
          user.walletAddresses.ubt,
          userId,
          session
        );
        
        await session.commitTransaction();
        session.endSession();
        
        return {
          BTC: user.walletAddresses.bitcoin,
          ETH: user.walletAddresses.ethereum,
          USDT: user.walletAddresses.ubt
        };
      }
      
      // If no addresses found, assign new ones
      
      // Find available addresses for each currency
      const btcAddress = await this.findAndReserveAddress('BTC', userId, session);
      const ethAddress = await this.findAndReserveAddress('ETH', userId, session);
      const usdtAddress = await this.findAndReserveAddress('USDT', userId, session);
      
      if (!btcAddress || !ethAddress || !usdtAddress) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        session.endSession();
        throw new Error('Not enough addresses available for assignment');
      }
      
      // Create or update user address record
      if (!userAddress) {
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
      } else {
        // Update existing UserAddress record
        userAddress.addresses.BTC = {
          address: btcAddress.address,
          assignedAt: new Date(),
          isActive: true
        };
        userAddress.addresses.ETH = {
          address: ethAddress.address,
          assignedAt: new Date(),
          isActive: true
        };
        userAddress.addresses.USDT = {
          address: usdtAddress.address,
          assignedAt: new Date(),
          isActive: true
        };
        userAddress.totalAssigned = 3;
        
        await userAddress.save({ session });
      }
      
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
      // Only abort if transaction is still active
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      console.error('Error in assignAddressesToUser:', error);
      throw error;
    }
  }
  
  /**
   * Ensure addresses are marked as assigned in CryptoAddress collection
   * @param {string} btcAddress - Bitcoin address
   * @param {string} ethAddress - Ethereum address
   * @param {string} usdtAddress - USDT address
   * @param {string} userId - User ID
   * @param {mongoose.ClientSession} session - Mongoose session
   */
  async ensureAddressesAreMarkedAsAssigned(btcAddress, ethAddress, usdtAddress, userId, session) {
    // Update BTC address
    await CryptoAddress.findOneAndUpdate(
      { address: btcAddress },
      {
        isAssigned: true,
        assignedTo: userId,
        assignedAt: new Date()
      },
      { upsert: true, session }
    );
    
    // Update ETH address
    await CryptoAddress.findOneAndUpdate(
      { address: ethAddress },
      {
        isAssigned: true,
        assignedTo: userId,
        assignedAt: new Date()
      },
      { upsert: true, session }
    );
    
    // Update USDT address
    await CryptoAddress.findOneAndUpdate(
      { address: usdtAddress },
      {
        isAssigned: true,
        assignedTo: userId,
        assignedAt: new Date()
      },
      { upsert: true, session }
    );
  }
  
  /**
   * Sync User model addresses with UserAddress collection
   * @param {string} userId - User ID
   * @param {string} btcAddress - Bitcoin address
   * @param {string} ethAddress - Ethereum address
   * @param {string} usdtAddress - USDT address
   * @param {mongoose.ClientSession} session - Mongoose session
   */
  async syncUserModelAddresses(userId, btcAddress, ethAddress, usdtAddress, session) {
    await User.findByIdAndUpdate(
      userId,
      {
        walletAddresses: {
          bitcoin: btcAddress,
          ethereum: ethAddress,
          ubt: usdtAddress
        }
      },
      { session }
    );
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
    
    if (userAddress && 
        userAddress.addresses.BTC?.address && 
        userAddress.addresses.ETH?.address && 
        userAddress.addresses.USDT?.address) {
      return {
        BTC: userAddress.addresses.BTC.address,
        ETH: userAddress.addresses.ETH.address,
        USDT: userAddress.addresses.USDT.address
      };
    }
    
    // If not found or incomplete, check User model
    const user = await User.findById(userId);
    
    if (user && 
        user.walletAddresses && 
        user.walletAddresses.bitcoin && 
        user.walletAddresses.ethereum && 
        user.walletAddresses.ubt) {
      
      // Sync with UserAddress collection for future consistency
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        await this.syncUserAddressCollection(
          userId, 
          user.walletAddresses.bitcoin,
          user.walletAddresses.ethereum,
          user.walletAddresses.ubt,
          session
        );
        
        await session.commitTransaction();
        session.endSession();
      } catch (error) {
        // Only abort if transaction is still active
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        session.endSession();
        console.error('Error syncing UserAddress collection:', error);
      }
      
      return {
        BTC: user.walletAddresses.bitcoin,
        ETH: user.walletAddresses.ethereum,
        USDT: user.walletAddresses.ubt
      };
    }
    
    // If still not found or incomplete, assign new addresses
    return this.assignAddressesToUser(userId);
  }
  
  /**
   * Sync UserAddress collection with User model
   * @param {string} userId - User ID
   * @param {string} btcAddress - Bitcoin address
   * @param {string} ethAddress - Ethereum address
   * @param {string} usdtAddress - USDT address
   * @param {mongoose.ClientSession} session - Mongoose session
   */
  async syncUserAddressCollection(userId, btcAddress, ethAddress, usdtAddress, session) {
    await UserAddress.findOneAndUpdate(
      { userId },
      {
        userId,
        addresses: {
          BTC: {
            address: btcAddress,
            assignedAt: new Date(),
            isActive: true
          },
          ETH: {
            address: ethAddress,
            assignedAt: new Date(),
            isActive: true
          },
          USDT: {
            address: usdtAddress,
            assignedAt: new Date(),
            isActive: true
          }
        },
        totalAssigned: 3
      },
      { upsert: true, session }
    );
    
    // Also ensure addresses are marked as assigned in CryptoAddress collection
    await this.ensureAddressesAreMarkedAsAssigned(
      btcAddress,
      ethAddress,
      usdtAddress,
      userId,
      session
    );
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
