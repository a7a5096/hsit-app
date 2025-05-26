import Address from '../models/Address.js';
import UserAddress from '../models/UserAddress.js';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

class AddressService {
  
  // Import addresses from CSV files
  async importAddressesFromCSV() {
    const importBatch = new Date().toISOString();
    const results = { BTC: 0, ETH: 0, USDT: 0 };
    
    try {
      // Import Bitcoin addresses
      await this.importCurrencyAddresses('bitcoin.csv', 'BTC', importBatch);
      results.BTC = await Address.countDocuments({ currency: 'BTC' });
      
      // Import Ethereum addresses
      await this.importCurrencyAddresses('ethereum.csv', 'ETH', importBatch);
      results.ETH = await Address.countDocuments({ currency: 'ETH' });
      
      // Import USDT addresses
      await this.importCurrencyAddresses('usdt.csv', 'USDT', importBatch);
      results.USDT = await Address.countDocuments({ currency: 'USDT' });
      
      console.log('Address import completed:', results);
      return results;
    } catch (error) {
      console.error('Error importing addresses:', error);
      throw error;
    }
  }

  async importCurrencyAddresses(filename, currency, importBatch) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '../data', filename);
    const addresses = [];
    
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(filePath)) {
        console.warn(`File ${filename} not found, skipping ${currency} import`);
        return resolve();
      }

      fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on('data', (row) => {
          const address = Object.values(row)[0]?.trim();
          if (address && this.isValidAddress(address, currency)) {
            addresses.push({
              address,
              currency,
              metadata: { importBatch }
            });
          }
        })
        .on('end', async () => {
          try {
            if (addresses.length > 0) {
              // Use insertMany with ordered: false to continue on duplicates
              await Address.insertMany(addresses, { 
                ordered: false,
                rawResult: true 
              }).catch(err => {
                // Ignore duplicate key errors
                if (err.code !== 11000) throw err;
              });
            }
            console.log(`Imported ${addresses.length} ${currency} addresses`);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  // Assign addresses to a user
  async assignAddressesToUser(userId, currencies = ['BTC', 'ETH', 'USDT']) {
    try {
      // Check if user already has addresses
      let userAddresses = await UserAddress.findOne({ userId });
      
      if (!userAddresses) {
        userAddresses = new UserAddress({ userId, addresses: {} });
      }

      const assignedAddresses = {};
      
      for (const currency of currencies) {
        // Skip if user already has this currency address
        if (userAddresses.addresses[currency]?.address && 
            userAddresses.addresses[currency]?.isActive) {
          assignedAddresses[currency] = userAddresses.addresses[currency].address;
          continue;
        }

        // Find available address
        const availableAddress = await Address.findOneAndUpdate(
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
          { new: true }
        );

        if (availableAddress) {
          userAddresses.addresses[currency] = {
            address: availableAddress.address,
            assignedAt: new Date(),
            isActive: true
          };
          assignedAddresses[currency] = availableAddress.address;
        } else {
          console.warn(`No available ${currency} addresses for user ${userId}`);
        }
      }

      // Update total assigned count
      userAddresses.totalAssigned = Object.keys(userAddresses.addresses)
        .filter(curr => userAddresses.addresses[curr]?.isActive).length;

      await userAddresses.save();
      
      return {
        userId,
        addresses: assignedAddresses,
        totalAssigned: userAddresses.totalAssigned
      };
    } catch (error) {
      console.error('Error assigning addresses:', error);
      throw error;
    }
  }

  // Get user's addresses
  async getUserAddresses(userId) {
    try {
      const userAddresses = await UserAddress.findOne({ userId });
      
      if (!userAddresses) {
        return { userId, addresses: {}, totalAssigned: 0 };
      }

      const activeAddresses = {};
      Object.keys(userAddresses.addresses).forEach(currency => {
        const addr = userAddresses.addresses[currency];
        if (addr?.isActive && addr?.address) {
          activeAddresses[currency] = {
            address: addr.address,
            assignedAt: addr.assignedAt
          };
        }
      });

      return {
        userId,
        addresses: activeAddresses,
        totalAssigned: userAddresses.totalAssigned
      };
    } catch (error) {
      console.error('Error getting user addresses:', error);
      throw error;
    }
  }

  // Get address statistics
  async getAddressStats() {
    try {
      const stats = await Address.aggregate([
        {
          $group: {
            _id: '$currency',
            total: { $sum: 1 },
            assigned: { $sum: { $cond: ['$isAssigned', 1, 0] } },
            available: { $sum: { $cond: ['$isAssigned', 0, 1] } }
          }
        }
      ]);

      const result = {
        BTC: { total: 0, assigned: 0, available: 0 },
        ETH: { total: 0, assigned: 0, available: 0 },
        USDT: { total: 0, assigned: 0, available: 0 }
      };

      stats.forEach(stat => {
        result[stat._id] = {
          total: stat.total,
          assigned: stat.assigned,
          available: stat.available
        };
      });

      return result;
    } catch (error) {
      console.error('Error getting address stats:', error);
      throw error;
    }
  }

  // Release user addresses (deactivate)
  async releaseUserAddresses(userId, currencies = null) {
    try {
      const userAddresses = await UserAddress.findOne({ userId });
      if (!userAddresses) return false;

      const currenciesToRelease = currencies || ['BTC', 'ETH', 'USDT'];
      
      for (const currency of currenciesToRelease) {
        if (userAddresses.addresses[currency]?.isActive) {
          // Mark address as unassigned in Address collection
          await Address.updateOne(
            { 
              address: userAddresses.addresses[currency].address,
              currency 
            },
            { 
              isAssigned: false, 
              assignedTo: null, 
              assignedAt: null 
            }
          );

          // Mark as inactive in user addresses
          userAddresses.addresses[currency].isActive = false;
        }
      }

      // Update total assigned count
      userAddresses.totalAssigned = Object.keys(userAddresses.addresses)
        .filter(curr => userAddresses.addresses[curr]?.isActive).length;

      await userAddresses.save();
      return true;
    } catch (error) {
      console.error('Error releasing user addresses:', error);
      throw error;
    }
  }

  // Validate address format
  isValidAddress(address, currency) {
    if (!address || typeof address !== 'string') return false;
    
    switch (currency) {
      case 'BTC':
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) ||
               /^bc1[a-z0-9]{39,59}$/.test(address);
      case 'ETH':
      case 'USDT':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      default:
        return false;
    }
  }

  // Bulk assign addresses to existing users
  async bulkAssignToExistingUsers() {
    try {
      const users = await User.find({}, '_id');
      
      const results = [];
      for (const user of users) {
        try {
          const assigned = await this.assignAddressesToUser(user._id);
          results.push(assigned);
        } catch (error) {
          console.error(`Error assigning to user ${user._id}:`, error.message);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk assignment:', error);
      throw error;
    }
  }
}

const addressService = new AddressService();
export default addressService;
