import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import CryptoAddress from '../models/CryptoAddress.js';
import UserAddress from '../models/UserAddress.js';
import addressAssignmentService from '../services/addressAssignmentService.js';

dotenv.config();

function hasString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function hasKeyForAddress(address, currency) {
  if (!hasString(address)) return false;
  const record = await CryptoAddress.findOne({ address, currency });
  return !!(record && hasString(record.privateKey));
}

async function userHasCompleteKeyedAddresses(user) {
  const btc = user.walletAddresses?.bitcoin || '';
  const eth = user.walletAddresses?.ethereum || '';
  const [btcOk, ethOk] = await Promise.all([
    hasKeyForAddress(btc, 'bitcoin'),
    hasKeyForAddress(eth, 'ethereum')
  ]);
  return hasString(btc) && hasString(eth) && btcOk && ethOk;
}

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const users = await User.find({}, '_id username email walletAddresses');
    const toFix = [];

    for (const user of users) {
      const valid = await userHasCompleteKeyedAddresses(user);
      if (!valid) toFix.push(user);
    }

    console.log(`Users requiring keyed address repair: ${toFix.length}`);

    for (const user of toFix) {
      try {
        const userId = user._id ? String(user._id) : (user.id ? String(user.id) : null);
        if (!userId) {
          throw new Error('User ID is missing');
        }

        // Clear existing address records to force fresh assignment.
        await UserAddress.deleteOne({ userId });
        await User.updateOne(
          { _id: userId },
          {
            $set: {
              'walletAddresses.bitcoin': '',
              'walletAddresses.ethereum': '',
              'walletAddresses.ubt': ''
            }
          }
        );

        await addressAssignmentService.assignAddressesToUser(userId);

        const refreshed = await User.findById(userId).select('walletAddresses email');
        const isValidNow = await userHasCompleteKeyedAddresses(refreshed);
        if (isValidNow) {
          console.log(`FIXED: ${user.email}`);
        } else {
          console.log(`STILL MISSING KEYS: ${user.email}`);
        }
      } catch (error) {
        console.error(`FAILED: ${user.email} -> ${error.message}`);
      }
    }

    // Final check
    const allUsers = await User.find({}, '_id email walletAddresses');
    const remaining = [];
    for (const user of allUsers) {
      const valid = await userHasCompleteKeyedAddresses(user);
      if (!valid) remaining.push(user.email);
    }

    console.log('\nFinal users still missing keyed addresses:', remaining.length);
    remaining.forEach((email) => console.log(`- ${email}`));
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

main();

