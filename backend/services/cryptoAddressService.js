const mongoose = require('mongoose');

// Use your existing cryptoaddresses collection
const CryptoAddress = mongoose.model('CryptoAddress', new mongoose.Schema({
  address: String,
  isAssigned: Boolean,
  type: String // 'BTC', 'ETH', 'USDT'
}), 'cryptoaddresses');

// Use your existing users collection  
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  walletAddresses: {
    bitcoin: String,
    ethereum: String,
    ubt: String // This seems to be your USDT field
  },
  balances: Object,
  createdAt: Date
}), 'users');

class CryptoAddressService {
  
  // Assign unique addresses to a user
  async assignAddressesToUser(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const updates = {};
      let hasUpdates = false;

      // Assign Bitcoin address if not already assigned
      if (!user.walletAddresses?.bitcoin) {
        const btcAddress = await CryptoAddress.findOneAndUpdate(
          { type: 'BTC', isAssigned: false },
          { isAssigned: true },
          { new: true }
        );
        
        if (btcAddress) {
          updates['walletAddresses.bitcoin'] = btcAddress.address;
          hasUpdates = true;
        }
      }

      // Assign Ethereum address if not already assigned  
      if (!user.walletAddresses?.ethereum) {
        const ethAddress = await CryptoAddress.findOneAndUpdate(
          { type: 'ETH', isAssigned: false },
          { isAssigned: true },
          { new: true }
        );
        
        if (ethAddress) {
          updates['walletAddresses.ethereum'] = ethAddress.address;
          hasUpdates = true;
        }
      }

      // Assign USDT address if not already assigned
      if (!user.walletAddresses?.ubt) {
        const usdtAddress = await CryptoAddress.findOneAndUpdate(
          { type: 'USDT', isAssigned: false },
          { isAssigned: true },
          { new: true }
        );
        
        if (usdtAddress) {
          updates['walletAddresses.ubt'] = usdtAddress.address;
          hasUpdates = true;
        }
      }

      // Update user if we have new addresses
      if (hasUpdates) {
        await User.findByIdAndUpdate(userId, updates);
        console.log(`Assigned new addresses to user ${userId}:`, updates);
      }

      // Return updated user
      const updatedUser = await User.findById(userId);
      return {
        userId: userId,
        addresses: updatedUser.walletAddresses
      };

    } catch (error) {
      console.error('Error assigning addresses:', error);
      throw error;
    }
  }

  // Import addresses from your CSV files
  async importAddressesFromCSV() {
    const csv = require('csv-parser');
    const fs = require('fs');
    const path = require('path');

    try {
      // Import Bitcoin addresses
      await this.importCurrencyAddresses('bitcoin.csv', 'BTC');
      
      // Import Ethereum addresses  
      await this.importCurrencyAddresses('ethereum.csv', 'ETH');
      
      // Import USDT addresses
      await this.importCurrencyAddresses('usdt.csv', 'USDT');

      const stats = await this.getAddressStats();
      console.log('Import completed:', stats);
      return stats;

    } catch (error) {
      console.error('Error importing addresses:', error);
      throw error;
    }
  }

  async importCurrencyAddresses(filename, type) {
    const csv = require('csv-parser');
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, '../data', filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filename} not found, skipping ${type} import`);
      return;
    }

    const addresses = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on('data', (row) => {
          const address = Object.values(row)[0]?.trim();
          if (address) {
            addresses.push({
              address: address,
              isAssigned: false,
              type: type
            });
          }
        })
        .on('end', async () => {
          try {
            if (addresses.length > 0) {
              // Insert addresses, ignoring duplicates
              for (const addr of addresses) {
                await CryptoAddress.findOneAndUpdate(
                  { address: addr.address },
                  addr,
                  { upsert: true, new: true }
                ).catch(err => {
                  // Ignore duplicate errors
                  if (err.code !== 11000) throw err;
                });
              }
            }
            console.log(`Imported ${addresses.length} ${type} addresses`);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  // Fix existing users with same addresses
  async fixDuplicateAddresses() {
    try {
      console.log('Starting duplicate address fix...');
      
      // Get all users
      const users = await User.find({});
      console.log(`Found ${users.length} users to check`);

      let fixedCount = 0;
      
      for (const user of users) {
        let needsUpdate = false;
        const updates = {};

        // Check if user has the problematic duplicate addresses
        const duplicateBTC = '1as4MZTVW362uNHhpkrhHeHYws9AG8Mdm';
        const duplicateETH = '0xc48eA7e07164eCB2C9Ab882C0Ef4C02Df1FA269a';

        if (user.walletAddresses?.bitcoin === duplicateBTC) {
          // Find a new unique BTC address
          const newBtcAddress = await CryptoAddress.findOneAndUpdate(
            { type: 'BTC', isAssigned: false },
            { isAssigned: true },
            { new: true }
          );
          
          if (newBtcAddress) {
            updates['walletAddresses.bitcoin'] = newBtcAddress.address;
            needsUpdate = true;
          }
        }

        if (user.walletAddresses?.ethereum === duplicateETH) {
          // Find a new unique ETH address
          const newEthAddress = await CryptoAddress.findOneAndUpdate(
            { type: 'ETH', isAssigned: false },
            { isAssigned: true },
            { new: true }
          );
          
          if (newEthAddress) {
            updates['walletAddresses.ethereum'] = newEthAddress.address;
            needsUpdate = true;
          }
        }

        if (user.walletAddresses?.ubt === duplicateETH) {
          // Find a new unique USDT address
          const newUsdtAddress = await CryptoAddress.findOneAndUpdate(
            { type: 'USDT', isAssigned: false },
            { isAssigned: true },
            { new: true }
          );
          
          if (newUsdtAddress) {
            updates['walletAddresses.ubt'] = newUsdtAddress.address;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await User.findByIdAndUpdate(user._id, updates);
          console.log(`Fixed addresses for user ${user.email}:`, updates);
          fixedCount++;
        }
      }

      console.log(`Fixed ${fixedCount} users with duplicate addresses`);
      return { fixedUsers: fixedCount };

    } catch (error) {
      console.error('Error fixing duplicate addresses:', error);
      throw error;
    }
  }

  async getAddressStats() {
    try {
      const stats = await CryptoAddress.aggregate([
        {
          $group: {
            _id: '$type',
            total: { $sum: 1 },
            assigned: { $sum: { $cond: ['$isAssigned', 1, 0] } },
            available: { $sum: { $cond: ['$isAssigned', 0, 1] } }
          }
        }
      ]);

      const result = {};
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
}

module.exports = new CryptoAddressService();
