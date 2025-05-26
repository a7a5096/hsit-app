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
      '1Hg1iGWcVQMSFkQXEkRW78BiZKrWcXMEL',
      '1F6jR5kQR6TypQSjFJMVLFmu4eWKTny1La',
      '15ZVbnpz9BM7aRWbtuu7PaE7iPWiQj3QrS',
      '1D9sJGGAPLnBo5f27CU1cBss341kAYJio6',
      '1JrJSfgQQQbX8tjqqXYLB2hjmYvnibqVki',
      '13LFKsF5SKYzE74GyCrstuFaEQLyrjs47K',
      '16sMgqAp2mCWwmcRDSLpV2FLiFaENZvBFU',
      '1BktntWerJ5swFnhwkKGQ5jyjXvBrahjoU',
      '1Ah4PyaiHHbB9MVH8wazwSUp8Rp5SvcCWb',
      '146i3ZDqpdsryGbn4f6RNw73Wxh59vdBum',
      '1DywfGzChEXfWfSXMWbRPrK73tTsGAqL3L',
      '1D2KXFKKaN55GhjPo3ErWsERxwi1BUsVJM',
      '1AnBxTJu7cH68PzfrmJ2UVxj6q8ubqcYm1',
      '1HCNVvHxxMBLZYgrGdu5bEY7fk74JWvovr',
      '1JkBLB2GFPDB5SCGv4ot2e5uPqXdufHKCS',
      '1MnxxLwFyjcjipghGXmRYZ6HU7ZLYjXuXm',
      '191AqDEmCEMnVKmHzX6LBgq1YJ1jJ8VdyF',
      '149Uec3Dc1gQ6YhY9cTmpRqpDc9933JehZ',
      '15CW3bHoC75YhdrgcdCpiUi5UtgUrFSi9C',
      '1PA4sa3DGJbEMiLJqVRzcHqDMhb28FF2Pa',
      '1NFTXN6F9j5YzhzEwb5phh1nbQEHTzajjv'
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
      '0x6E02f90984aA6Aa3CC9Dc87674C3f27E59a19BA7',
      '0x92B7C3d52A69848fbf91FDE59D6B7D6aDb530985',
      '0xC81d51367A32bB5e36204A0A95ab5c79f3Bf2097',
      '0x45BE24283a37d1301ef227ebc74Cf52117125B02',
      '0xF2a121A9B71a3CD21830A60C4f1e3c5753131636',
      '0xb271d52c6f7581Eb5A0b27266afa74f4d5921f87',
      '0xD267Cf47581883a0Ab4D01C9C4F911f13D1111C6',
      '0x081Ee926b3b67BF690B1528E2c5715Ac0068cd9E',
      '0x316187d7128bDF7712aB13E3859E91712af92629',
      '0xC48972e0C0aCF7d820a528D718889d0e516C6e3f',
      '0x7FAe0d0Ad3C87D4A894F140E3c0C7E849e1Bd0e1',
      '0x92AAA46473CfDbB8e5778B1005f9c8d8587d4821',
      '0x0038885ff2F1B98B4D9A72Db610E7134f5737162',
      '0x37a6da9268651bec7Cb2841D757228817a723f6c',
      '0xFA48E8DB66Ce77527f50A221dA174f556c558b70',
      '0x40473244FD59379142Ba232DF42a9a91178f73EF',
      '0xB2ef6A0924b527E91Aafcf19a2D92449129BD8Ca',
      '0x81E47DC26643Abf7eC2DBC631441CF97274f6bBB',
      '0xD9b45e072B5F21B32273137D603Ea66Da395C94c',
      '0x2dA4d61da3d7F294ED43e834f37dB64eE9C6E5C6',
      '0xEba2283F8b65C2FB641B005CeAa87a8Ba476Fb0d'
    ];

    const cryptoCollection = this.db.collection('cryptoaddresses');
    
    // Import Bitcoin addresses
    for (const address of bitcoinAddresses) {
      await cryptoCollection.updateOne(
        { address },
        { $set: { address, isAssigned: false, type: 'BTC' } },
        { upsert: true }
      );
    }

    // Import Ethereum addresses
    for (const address of ethereumAddresses) {
      await cryptoCollection.updateOne(
        { address },
        { $set: { address, isAssigned: false, type: 'ETH' } },
        { upsert: true }
      );
    }

    // Import USDT addresses (using same ETH addresses)
    for (const address of ethereumAddresses) {
      await cryptoCollection.updateOne(
        { address: `${address}_usdt` },
        { $set: { address, isAssigned: false, type: 'USDT' } },
        { upsert: true }
      );
    }

    console.log('Successfully imported addresses to database');
    
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

    console.log(`Found ${users.length} users to check for duplicate addresses`);

    for (const user of users) {
      const updates = {};
      let needsUpdate = false;

      // Fix Bitcoin address
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

      // Fix Ethereum address
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

      // Fix USDT address
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
        console.log(`Fixed addresses for user ${user.email}:`, Object.values(updates));
        fixedCount++;
      }
    }

    console.log(`Fixed ${fixedCount} users with duplicate addresses`);
    return { fixedUsers: fixedCount };
  }

  async assignAddressesToUser(userId) {
    await this.initialize();
    
    const usersCollection = this.db.collection('users');
    const cryptoCollection = this.db.collection('cryptoaddresses');
    
    const user = await usersCollection.findOne({ _id: mongoose.Types.ObjectId(userId) });
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
      await usersCollection.updateOne({ _id: user._id }, { $set: updates });
      console.log(`Assigned new addresses to user ${user.email}:`, Object.values(updates));
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
