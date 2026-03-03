import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';

dotenv.config();

function hasString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);

    const users = await User.find({}, 'username email walletAddresses');
    const missing = [];

    for (const user of users) {
      const btcAddress = user.walletAddresses?.bitcoin || '';
      const ethAddress = user.walletAddresses?.ethereum || '';
      const [btcDoc, ethDoc] = await Promise.all([
        hasString(btcAddress) ? CryptoAddress.findOne({ address: btcAddress, currency: 'bitcoin' }) : null,
        hasString(ethAddress) ? CryptoAddress.findOne({ address: ethAddress, currency: 'ethereum' }) : null
      ]);

      const btcHasKey = !!(btcDoc && hasString(btcDoc.privateKey));
      const ethHasKey = !!(ethDoc && hasString(ethDoc.privateKey));

      if (!hasString(btcAddress) || !hasString(ethAddress) || !btcHasKey || !ethHasKey) {
        missing.push({
          username: user.username,
          email: user.email,
          btcAddress: btcAddress || null,
          ethAddress: ethAddress || null,
          btcDocFound: !!btcDoc,
          ethDocFound: !!ethDoc,
          btcHasKey,
          ethHasKey
        });
      }
    }

    console.log(`Missing keyed deposit addresses: ${missing.length}`);
    missing.forEach((row) => {
      console.log(
        `- ${row.email} | btc=${row.btcAddress} btcDocFound=${row.btcDocFound} btcHasKey=${row.btcHasKey} eth=${row.ethAddress} ethDocFound=${row.ethDocFound} ethHasKey=${row.ethHasKey}`
      );
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

main();

