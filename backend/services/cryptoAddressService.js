import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use your existing cryptoaddresses collection
const CryptoAddress = mongoose.model('CryptoAddress', new mongoose.Schema({
  address: String,
  isAssigned: Boolean,
  type: String
}), 'cryptoaddresses');

// Use your existing users collection  
const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  walletAddresses: {
    bitcoin: String,
    ethereum: String,
    ubt: String
  },
  balances: Object,
  createdAt: Date
}), 'users');

class CryptoAddressService {
  
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

  async importAddressesFromCSV() {
    try {
      await this.importCurrencyAddresses('bitcoin.csv', 'BTC');
      await this.importCurrencyAddresses('ethereum.csv', 'ETH');
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
    const filePath = path.join(__dirname, '../data', filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filename} not found, skipping ${type} import`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      const addresses = lines.map(line => ({
        address: line.trim(),
        isAssigned: false,
        type: type
      })).filter(addr => addr.address);

      if (addresses.length > 0) {
        for (const addr of addresses) {
          await CryptoAddress.findOneAndUpdate(
            { address: addr.address },
            addr,
            { upsert: true, new: true }
          ).catch(err => {
            if (err.code !== 11000) throw err;
          });
        }
      }
      
      console.log(`Imported ${addresses.length} ${type} addresses`);
    } catch (error) {
      console.error(`Error importing ${type} addresses:`, error);
      throw error;
    }
  }

  async fixDuplicateAddresses() {
    try {
      console.log('Starting duplicate address fix...');
      
      const users = await User.find({});
      console.log(`Found ${users.length} users to check`);

      let fixedCount = 0;
      
      for (const user of users) {
        let needsUpdate = false;
        const updates = {};

        const duplicateBTC = '1as4MZTVW362uNHhpkrhHeHYws9AG8Mdm';
        const duplicateETH = '0xc48eA7e07164eCB2C9Ab882C0Ef4C02Df1FA269a';

        if (user.walletAddresses?.bitcoin === duplicateBTC) {
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

export default new CryptoAddressService();
