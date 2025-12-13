import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../backend/models/User.js';
import UserAddress from '../backend/models/UserAddress.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    // console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const listAddresses = async () => {
  await connectDB();

  try {
    const users = await User.find({}).sort({ username: 1 });
    const userAddresses = await UserAddress.find({});

    const userAddressMap = {};
    userAddresses.forEach(ua => {
      if (ua.userId) {
        userAddressMap[ua.userId.toString()] = ua;
      }
    });

    console.log('USER DEPOSIT ADDRESSES REPORT');
    console.log('=============================');

    for (const user of users) {
      // Try to get ID safely
      const userId = user._id ? user._id.toString() : null;
      const ua = userId ? userAddressMap[userId] : null;
      
      console.log(`User: ${user.username} (Email: ${user.email})`);
      if (userId) {
          // console.log(`  User ID: ${userId}`);
      } else {
          console.log(`  [Warning: User has no _id]`);
      }
      
      let hasAddress = false;

      // Check UserAddress model (Preferred)
      if (ua && ua.addresses) {
           if (ua.addresses.BTC && ua.addresses.BTC.address) {
               console.log(`  BTC:  ${ua.addresses.BTC.address}`);
               hasAddress = true;
           }
           if (ua.addresses.ETH && ua.addresses.ETH.address) {
               console.log(`  ETH:  ${ua.addresses.ETH.address}`);
               hasAddress = true;
           }
           if (ua.addresses.USDT && ua.addresses.USDT.address) {
               console.log(`  USDT: ${ua.addresses.USDT.address}`);
               hasAddress = true;
           }
      }
      
      // Check User model (Legacy/Fallback)
      if (user.walletAddresses) {
           // If we already printed from UserAddress, only print if different or new
           
           const btc = user.walletAddresses.bitcoin;
           const eth = user.walletAddresses.ethereum;
           const ubt = user.walletAddresses.ubt;

           const uaBtc = ua?.addresses?.BTC?.address;
           const uaEth = ua?.addresses?.ETH?.address;
           const uaUsdt = ua?.addresses?.USDT?.address;

           if (btc && btc !== uaBtc) {
               console.log(`  BTC (Legacy):  ${btc}`);
               hasAddress = true;
           }
           if (eth && eth !== uaEth) {
               console.log(`  ETH (Legacy):  ${eth}`);
               hasAddress = true;
           }
           if (ubt && ubt !== uaUsdt) {
               console.log(`  UBT (Legacy):  ${ubt}`);
               hasAddress = true;
           }
      }

      if (!hasAddress) {
          console.log(`  No deposit addresses assigned.`);
      }
      
      console.log(''); // Empty line between users
    }

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

listAddresses();
