// Script to import crypto addresses from database
require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config/config');
const CryptoAddress = require('../models/CryptoAddress');
const ExchangeRate = require('../models/ExchangeRate');

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  
  // Check if addresses already exist in the database
  const btcCount = await CryptoAddress.countDocuments({ type: 'BTC' });
  const ethCount = await CryptoAddress.countDocuments({ type: 'ETH' });
  
  console.log(`Current address counts: BTC: ${btcCount}, ETH: ${ethCount}`);
  
  // Only proceed with import if no addresses exist
  if (btcCount === 0 && ethCount === 0) {
    console.log('No addresses found in database. Please use the admin interface to import addresses.');
    console.log('Alternatively, you can use the API endpoint to import addresses programmatically.');
  } else {
    console.log('Addresses already exist in the database. No import needed.');
  }
  
  // Initialize exchange rate if not exists
  const existingRate = await ExchangeRate.findOne({});
  if (!existingRate) {
    const newRate = new ExchangeRate({
      withdrawalCount: 0,
      currentRate: config.UBT_INITIAL_EXCHANGE_RATE,
      buyRate: config.UBT_INITIAL_EXCHANGE_RATE * config.UBT_BUY_RATE_FACTOR
    });
    await newRate.save();
    console.log('Exchange rate initialized');
  }
  
  console.log('Import check completed');
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
