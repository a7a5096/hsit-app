import mongoose from 'mongoose';

/**
 * Service for managing cryptocurrency addresses
 * Consolidated from previous AddressService and CryptoAddressService
 */
class CryptoAddressService {
  /**
   * Find an available address for a specific currency
   * @param {string} currency - The cryptocurrency type (BTC, ETH, USDT, UBT)
   * @returns {Promise<Object>} - Available address or null
   */
  static async findAvailableAddress(currency) {
    const CryptoAddress = mongoose.model('CryptoAddress');
    return await CryptoAddress.findAvailableAddress(currency);
  }

  /**
   * Assign an address to a user
   * @param {string} addressId - The address ID to assign
   * @param {string} userId - The user ID to assign the address to
   * @returns {Promise<Object>} - Updated address document
   */
  static async assignAddressToUser(addressId, userId) {
    const CryptoAddress = mongoose.model('CryptoAddress');
    return await CryptoAddress.assignToUser(addressId, userId);
  }

  /**
   * Get all addresses assigned to a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of addresses assigned to the user
   */
  static async getUserAddresses(userId) {
    const CryptoAddress = mongoose.model('CryptoAddress');
    return await CryptoAddress.find({
      assignedTo: userId,
      isActive: true
    }).sort({ currency: 1 });
  }

  /**
   * Get a specific user address by currency
   * @param {string} userId - The user ID
   * @param {string} currency - The cryptocurrency type
   * @returns {Promise<Object>} - Address document or null
   */
  static async getUserAddressByCurrency(userId, currency) {
    const CryptoAddress = mongoose.model('CryptoAddress');
    return await CryptoAddress.findOne({
      assignedTo: userId,
      currency: currency,
      isActive: true
    });
  }

  /**
   * Create a new cryptocurrency address
   * @param {Object} addressData - The address data
   * @returns {Promise<Object>} - Created address document
   */
  static async createAddress(addressData) {
    const CryptoAddress = mongoose.model('CryptoAddress');
    return await CryptoAddress.create(addressData);
  }

  /**
   * Import multiple addresses
   * @param {Array} addresses - Array of address objects
   * @param {string} batchId - Optional batch identifier
   * @returns {Promise<Object>} - Import results
   */
  static async importAddresses(addresses, batchId = null) {
    const CryptoAddress = mongoose.model('CryptoAddress');
    const importBatch = batchId || `batch_${Date.now()}`;
    
    const results = {
      total: addresses.length,
      imported: 0,
      duplicates: 0,
      errors: []
    };

    for (const addr of addresses) {
      try {
        addr.metadata = addr.metadata || {};
        addr.metadata.importBatch = importBatch;
        
        // privateKey is now optional, so we don't need to check for it
        await CryptoAddress.create(addr);
        results.imported++;
      } catch (error) {
        if (error.code === 11000) { // Duplicate key error
          results.duplicates++;
        } else {
          results.errors.push({
            address: addr.address,
            error: error.message
          });
        }
      }
    }
    
    return results;
  }
}

export default CryptoAddressService;
