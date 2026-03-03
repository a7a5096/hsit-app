import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import UserAddress from '../models/UserAddress.js';
import CryptoAddress from '../models/CryptoAddress.js';

dotenv.config();

function hasString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function hasKnownPrivateKey(address, currency) {
  if (!hasString(address)) return false;
  const record = await CryptoAddress.findOne({ address, currency });
  return !!(record && hasString(record.privateKey));
}

async function markAddressAssigned(address, currency, userId, session) {
  await CryptoAddress.findOneAndUpdate(
    { address, currency },
    { $set: { used: true, assignedTo: userId, assignedAt: new Date() } },
    { session, new: true, upsert: false }
  );
}

async function reservePooledAddress(currency, userId, session) {
  return CryptoAddress.findOneAndUpdate(
    {
      currency,
      used: false,
      assignedTo: null,
      privateKey: { $exists: true, $ne: null, $ne: '' }
    },
    { $set: { used: true, assignedTo: userId, assignedAt: new Date() } },
    { session, new: true, sort: { createdAt: 1 } }
  );
}

async function ensureSingleUserAddresses(user) {
  const btc = user.walletAddresses?.bitcoin || '';
  const eth = user.walletAddresses?.ethereum || '';

  const hasBtcKey = await hasKnownPrivateKey(btc, 'bitcoin');
  const hasEthKey = await hasKnownPrivateKey(eth, 'ethereum');
  const hasCompleteWalletFields = hasString(btc) && hasString(eth);

  if (hasCompleteWalletFields && hasBtcKey && hasEthKey) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await markAddressAssigned(btc, 'bitcoin', user._id, session);
        await markAddressAssigned(eth, 'ethereum', user._id, session);

        await UserAddress.findOneAndUpdate(
          { userId: user._id },
          {
            $set: {
              userId: user._id,
              'addresses.BTC': { address: btc, assignedAt: new Date(), isActive: true },
              'addresses.ETH': { address: eth, assignedAt: new Date(), isActive: true },
              'addresses.USDT': { address: eth, assignedAt: new Date(), isActive: true },
              totalAssigned: 3
            }
          },
          { upsert: true, new: true, session }
        );

        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              'walletAddresses.bitcoin': btc,
              'walletAddresses.ethereum': eth,
              'walletAddresses.ubt': eth
            }
          },
          { session }
        );
      });
      return { changed: false, reason: 'already_valid' };
    } finally {
      session.endSession();
    }
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const [btcDoc, ethDoc] = await Promise.all([
        reservePooledAddress('bitcoin', user._id, session),
        reservePooledAddress('ethereum', user._id, session)
      ]);

      if (!btcDoc || !ethDoc) {
        throw new Error('Insufficient available BTC/ETH addresses with private keys in pool.');
      }

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'walletAddresses.bitcoin': btcDoc.address,
            'walletAddresses.ethereum': ethDoc.address,
            'walletAddresses.ubt': ethDoc.address
          }
        },
        { session }
      );

      await UserAddress.findOneAndUpdate(
        { userId: user._id },
        {
          $set: {
            userId: user._id,
            'addresses.BTC': { address: btcDoc.address, assignedAt: new Date(), isActive: true },
            'addresses.ETH': { address: ethDoc.address, assignedAt: new Date(), isActive: true },
            'addresses.USDT': { address: ethDoc.address, assignedAt: new Date(), isActive: true },
            totalAssigned: 3
          }
        },
        { upsert: true, new: true, session }
      );
    });

    return { changed: true, reason: 'reassigned_with_private_keys' };
  } finally {
    session.endSession();
  }
}

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGODB_URI / MONGO_URI is not configured.');

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const users = await User.find({}, '_id username email walletAddresses').lean(false);
    console.log(`Total users to process: ${users.length}`);

    const summary = {
      totalUsers: users.length,
      unchanged: 0,
      reassigned: 0,
      failed: 0
    };
    const failures = [];

    for (const user of users) {
      const label = `${user.username} <${user.email}>`;
      try {
        const result = await ensureSingleUserAddresses(user);
        if (result.changed) {
          summary.reassigned += 1;
          console.log(`REASSIGNED: ${label}`);
        } else {
          summary.unchanged += 1;
          console.log(`OK: ${label}`);
        }
      } catch (error) {
        summary.failed += 1;
        failures.push({ userId: user._id.toString(), email: user.email, error: error.message });
        console.error(`FAILED: ${label} -> ${error.message}`);
      }
    }

    const usersMissingKeys = await User.find({}, '_id email walletAddresses').lean();
    let stillMissing = 0;
    const missingUsers = [];
    for (const user of usersMissingKeys) {
      const btc = user.walletAddresses?.bitcoin || '';
      const eth = user.walletAddresses?.ethereum || '';
      const [hasBtcKey, hasEthKey] = await Promise.all([
        hasKnownPrivateKey(btc, 'bitcoin'),
        hasKnownPrivateKey(eth, 'ethereum')
      ]);
      if (!hasString(btc) || !hasString(eth) || !hasBtcKey || !hasEthKey) {
        stillMissing += 1;
        missingUsers.push({
          userId: user._id.toString(),
          email: user.email,
          bitcoin: btc || null,
          ethereum: eth || null,
          btcHasKey: hasBtcKey,
          ethHasKey: hasEthKey
        });
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Total users: ${summary.totalUsers}`);
    console.log(`Already valid: ${summary.unchanged}`);
    console.log(`Reassigned: ${summary.reassigned}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Users still missing keyed addresses: ${stillMissing}`);
    if (missingUsers.length > 0) {
      console.log('\nUsers still missing keyed addresses:');
      missingUsers.forEach((u) => {
        console.log(`- ${u.email} | BTC key: ${u.btcHasKey} | ETH key: ${u.ethHasKey}`);
      });
    }

    if (failures.length > 0) {
      console.log('\nFailures:');
      failures.forEach((f) => console.log(`- ${f.email}: ${f.error}`));
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

main();

