import mongoose from 'mongoose';

class CryptoAddressService {
  
  constructor() {
    // Use MongoDB collections directly to avoid model conflicts
    this.db = null;
  }

  async initialize() {
    if (!this.db) {
      this.db = mongoose.connection.db;
    }
  }

  async importAddresses() {
    await this.initialize();
    
    const bitcoinAddresses = [
      '1M8qHQg7pMV9s5esnNLEAVAq7EjKkU6h22',
      '17cQfUMhGUgZHKoRgErHfv4LuvNWTv3ZTK',
      '187RRkxsn4hGC6QotDq3fRLxvbXD4153m5',
      '14VDgkSZFG7UgzyfoeY7uq3JQkkve5d6hc',
      '1MyaW8mXbreGsEgQ7JuNuKzd6DsypA2nAc',
      '1RR5MZeNWgX9SBXPCBfRDd8zWSecgteJg',
      '1BfQoXsD5mezcM6ujB1xwY4K8evb9ZUQMv',
      '1H86oRtHrR2YrXR8opvZUZf322MEsEBdm9',
      '1NrLcuWFg4LN5xRisMbe9ooWnngd3A9S6R',
      '1Hg1iGWcVQMSFkQXEkRW78BiZKrWcXMEL'
    ];

    const ethereumAddresses = [
      '0x0cBb0Fb2A44e1282710BA7ac4F7d566647379527',
      '0x8609CA11520Cb361B014947ed286C587D53b0D8b',
      '0xE4cD66E1e36265DC6beFB2b9D413D42871753226',
      '0x647a4623F2e01dEFc886fB5134E4262120f4f8A3',
      '0xC531B4dE170CC2ab84bDACcF75d7F36574f113Cd',
      '0x7B3E1EC995a2Ef00409cBE1B671DaC58f9E2849D',
      '0x40dAB5FBdc5C82Ddc27acfEA6aE786dd6726e814',
      '0xAbe5Fd383dc24D14E287C055Af0e85952117e605',
      '0x066C2A3a55AD6c676bA0BC3eBE6022fe318284c8',
      '0x6E02f90984aA6Aa3CC9Dc87674C3f27E59a19BA7'
    ];

    const cryptoCollection = this.db.collection('cryptoaddresses');
    
    // Import Bitcoin
    for (const address of bitcoinAddresses) {
      await cryptoCollection.updateOne(
        { address },
        { $set: { address, isAssigned: false, type: 'BTC' } },
        { upsert: true }
      );
    }

    // Import Ethereum
    for (const address of ethereumAddresses) {
      await cryptoCollection.updateOne(
        { address },
        { $set: { address, isAssigned: false, type: 'ETH' } },
        { upsert: true }
      );
    }

    // Import USDT (using same ETH addresses)
    for (const address of ethereumAddresses) {
      await cryptoCollection.updateOne(
        { address: `${address}_usdt` },
        { $set: { address, isAssigned: false, type: 'USDT' } },
        { upsert: true }
      );
    }

    return {
      BTC: bitcoinAddresses.length,
      ETH: ethereumAddresses.length,
      USDT: ethereumAddresses.length
    };
  }

  async fixDuplicateAddresses() {
    await this.initialize();
    
    const usersCollection = this.db.collection('users');
    const cryptoCollection = this.db.collection('cryptoaddresses');
    
    const users = await usersCollection.find({}).toArray();
    let fixedCount = 0;
    
    const duplicateBTC = '1as4MZTVW362uNHhpkrhHeHYws9AG8Mdm';
    const duplicateETH = '0xc48eA7e07164eCB2C9Ab882C0Ef4C02Df1FA269a';

    for (const user of users) {
      const updates = {};
      let needsUpdate = false;

      // Fix Bitcoin
      if (user.walletAddresses?.bitcoin === duplicateBTC) {
        const newBtc = await cryptoCollection.findOneAndUpdate(
          { type: 'BTC', isAssigned: false },
          { $set: { isAssigned: true } },
          { returnDocument: 'after' }
        );
        
        if (newBtc.value) {
          updates['walletAddresses.bitcoin'] = newBtc.value.address;
          needsUpdate = true;
        }
      }

      // Fix Ethereum
      if (user.walletAddresses?.ethereum === duplicateETH) {
        const newEth = await cryptoCollection.findOneAndUpdate(
          { type: 'ETH', isAssigned: false },
          { $set: { isAssigned: true } },
          { returnDocument: 'after' }
        );
        
        if (newEth.value) {
          updates['walletAddresses.ethereum'] = newEth.value.address;
          needsUpdate = true;
        }
      }

      // Fix USDT
      if (user.walletAddresses?.ubt === duplicateETH) {
        const newUsdt = await cryptoCollection.findOneAndUpdate(
          { type: 'USDT', isAssigned: false },
          { $set: { isAssigned: true } },
          { returnDocument: 'after' }
        );
        
        if (newUsdt.value) {
          updates['walletAddresses.ubt'] = newUsdt.value.address;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: updates }
        );
        console.log(`Fixed user ${user.email}:`, updates);
        fixedCount++;
      }
    }

    return { fixedUsers: fixedCount };
  }

  async assignAddressesToUser(userId) {
    await this.initialize();
    
    const usersCollection = this.db.collection('users');
    const cryptoCollection = this.db.collection('cryptoaddresses');
    
    const user = await usersCollection.findOne({ _id: userId });
    if (!user) throw new Error('User not found');

    const updates = {};
    let needsUpdate = false;

    // Assign Bitcoin if needed
    if (!user.walletAddresses?.bitcoin) {
      const btcAddress = await cryptoCollection.findOneAndUpdate(
        { type: 'BTC', isAssigned: false },
        { $set: { isAssigned: true } },
        { returnDocument: 'after' }
      );
      
      if (btcAddress.value) {
        updates['walletAddresses.bitcoin'] = btcAddress.value.address;
        needsUpdate = true;
      }
    }

    // Assign Ethereum if needed
    if (!user.walletAddresses?.ethereum) {
      const ethAddress = await cryptoCollection.findOneAndUpdate(
        { type: 'ETH', isAssigned: false },
        { $set: { isAssigned: true } },
        { returnDocument: 'after' }
      );
      
      if (ethAddress.value) {
        updates['walletAddresses.ethereum'] = ethAddress.value.address;
        needsUpdate = true;
      }
    }

    // Assign USDT if needed
    if (!user.walletAddresses?.ubt) {
      const usdtAddress = await cryptoCollection.findOneAndUpdate(
        { type: 'USDT', isAssigned: false },
        { $set: { isAssigned: true } },
        { returnDocument: 'after' }
      );
      
      if (usdtAddress.value) {
        updates['walletAddresses.ubt'] = usdtAddress.value.address;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await usersCollection.updateOne({ _id: userId }, { $set: updates });
    }

    return updates;
  }

  async getStats() {
    await this.initialize();
    
    const cryptoCollection = this.db.collection('cryptoaddresses');
    
    const stats = await cryptoCollection.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          assigned: { $sum: { $cond: ['$isAssigned', 1, 0] } },
          available: { $sum: { $cond: ['$isAssigned', 0, 1] } }
        }
      }
    ]).toArray();

    const result = {};
    stats.forEach(stat => {
      result[stat._id] = {
        total: stat.total,
        assigned: stat.assigned,
        available: stat.available
      };
    });

    return result;
  }
}

export default new CryptoAddressService();
