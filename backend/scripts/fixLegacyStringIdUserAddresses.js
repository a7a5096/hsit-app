import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function reserveAddress(cryptoCollection, currency, ownerId) {
  const result = await cryptoCollection.findOneAndUpdate(
    {
      currency,
      used: false,
      assignedTo: null,
      privateKey: { $exists: true, $ne: null, $ne: '' }
    },
    {
      $set: {
        used: true,
        assignedTo: ownerId,
        assignedAt: new Date()
      }
    },
    { returnDocument: 'after', sort: { createdAt: 1 } }
  );
  // Driver compatibility: some versions return { value }, others return the document directly.
  return result?.value || result || null;
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const usersCol = db.collection('users');
    const userAddressesCol = db.collection('useraddresses');
    const cryptoCol = db.collection('cryptoaddresses');

    const targetEmails = [
      'admin@hsit.com',
      'user1@example.com',
      'user2@example.com',
      'user3@example.com',
      'user4@example.com'
    ];

    const users = await usersCol.find({ email: { $in: targetEmails } }).toArray();
    console.log(`Legacy users found: ${users.length}`);

    for (const user of users) {
      const userId = user._id; // legacy string id
      const btc = await reserveAddress(cryptoCol, 'bitcoin', userId);
      const eth = await reserveAddress(cryptoCol, 'ethereum', userId);

      if (!btc || !eth) {
        console.log(`FAILED: ${user.email} (insufficient pool)`);
        continue;
      }

      await usersCol.updateOne(
        { _id: userId },
        {
          $set: {
            'walletAddresses.bitcoin': btc.address,
            'walletAddresses.ethereum': eth.address,
            'walletAddresses.ubt': eth.address
          }
        }
      );

      await userAddressesCol.updateOne(
        { userId },
        {
          $set: {
            userId,
            'addresses.BTC': { address: btc.address, assignedAt: new Date(), isActive: true },
            'addresses.ETH': { address: eth.address, assignedAt: new Date(), isActive: true },
            'addresses.USDT': { address: eth.address, assignedAt: new Date(), isActive: true },
            totalAssigned: 3
          }
        },
        { upsert: true }
      );

      console.log(`FIXED: ${user.email}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

main();

