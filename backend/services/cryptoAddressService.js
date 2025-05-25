/**
 * Crypto Address Service
 * Handles all operations related to crypto address assignment and management
 */

import CryptoAddress from '../models/CryptoAddress.js';
import User from '../models/User.js';

/**
 * Assigns a unique crypto address to a user if they don't already have one
 * @param {string} userId - User ID
 * @param {string} cryptoType - Type of cryptocurrency (BTC, ETH, USDT)
 * @returns {Promise<Object>} - Object containing success status and address information
 */
export const assignCryptoAddress = async (userId, cryptoType) => {
  try {
    // Validate inputs
    if (!userId || !cryptoType) {
      return { success: false, message: 'User ID and crypto type are required' };
    }

    // Normalize crypto type
    const normalizedType = cryptoType.toUpperCase();
    if (!['BTC', 'ETH', 'USDT'].includes(normalizedType)) {
      return { success: false, message: 'Invalid crypto type' };
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Check if user already has an address for this crypto type
    const walletField = normalizedType === 'BTC' ? 'bitcoin' : 
                        (normalizedType === 'ETH' ? 'ethereum' : 'ubt');
    
    if (user.walletAddresses && user.walletAddresses[walletField] && user.walletAddresses[walletField].length > 0) {
      // User already has an address, return it
      return {
        success: true,
        address: user.walletAddresses[walletField],
        message: 'User already has an address assigned'
      };
    }

    // Find an unassigned address of the specified type
    // For USDT, we use ETH addresses (ERC-20 tokens)
    const addressType = normalizedType === 'USDT' ? 'ETH' : normalizedType;
    const unassignedAddress = await CryptoAddress.findOne({
      type: addressType,
      isAssigned: false
    });

    if (!unassignedAddress) {
      return { success: false, message: `No available ${addressType} addresses` };
    }

    // Mark address as assigned in CryptoAddress collection
    unassignedAddress.isAssigned = true;
    unassignedAddress.assignedTo = userId;
    unassignedAddress.assignedAt = new Date();
    await unassignedAddress.save();

    // Update user's wallet addresses
    if (!user.walletAddresses) {
      user.walletAddresses = {};
    }
    
    user.walletAddresses[walletField] = unassignedAddress.address;
    await user.save();

    return {
      success: true,
      address: unassignedAddress.address,
      message: 'Address assigned successfully'
    };
  } catch (error) {
    console.error('Error assigning crypto address:', error);
    return { success: false, message: 'Server error', error: error.message };
  }
};

/**
 * Gets a user's crypto addresses
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Object containing success status and addresses
 */
export const getUserCryptoAddresses = async (userId) => {
  try {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Check if user has wallet addresses
    if (!user.walletAddresses) {
      return { success: false, message: 'User has no wallet addresses' };
    }

    // Return addresses
    return {
      success: true,
      addresses: {
        btcAddress: user.walletAddresses.bitcoin || '',
        ethAddress: user.walletAddresses.ethereum || '',
        ubtAddress: user.walletAddresses.ubt || user.walletAddresses.ethereum || ''
      }
    };
  } catch (error) {
    console.error('Error getting user crypto addresses:', error);
    return { success: false, message: 'Server error', error: error.message };
  }
};

/**
 * Imports crypto addresses from an array
 * @param {Array} addresses - Array of addresses
 * @param {string} type - Type of cryptocurrency (BTC, ETH, USDT)
 * @returns {Promise<Object>} - Object containing success status and import count
 */
export const importCryptoAddresses = async (addresses, type) => {
  try {
    // Validate inputs
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return { success: false, message: 'Addresses array is required' };
    }

    if (!type || !['BTC', 'ETH', 'USDT'].includes(type.toUpperCase())) {
      return { success: false, message: 'Valid crypto type is required' };
    }

    // Normalize type
    const normalizedType = type.toUpperCase();

    // Import addresses
    let importCount = 0;
    for (const address of addresses) {
      // Check if address already exists
      const existingAddress = await CryptoAddress.findOne({
        address,
        type: normalizedType
      });

      if (!existingAddress) {
        // Create new address
        const newAddress = new CryptoAddress({
          type: normalizedType,
          address,
          isAssigned: false
        });
        await newAddress.save();
        importCount++;
      }
    }

    return {
      success: true,
      importCount,
      message: `Successfully imported ${importCount} ${normalizedType} addresses`
    };
  } catch (error) {
    console.error('Error importing crypto addresses:', error);
    return { success: false, message: 'Server error', error: error.message };
  }
};

export default {
  assignCryptoAddress,
  getUserCryptoAddresses,
  importCryptoAddresses
};
