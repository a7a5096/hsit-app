// Script to import crypto addresses from CSV files to database
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const CryptoAddress = require('../models/CryptoAddress');

// Connect to MongoDB
mongoose.connect(config.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected');
  
  // Read BTC addresses
  const btcFilePath = path.join(__dirname, '../../bitcoin.csv');
  const btcData = fs.readFileSync(btcFilePath, 'utf8');
  const btcAddresses = btcData.split('\n').filter(line => line.trim() !== '');
  console.log(`Found ${btcAddresses.length} BTC addresses`);
  
  // Read ETH addresses
  const ethFilePath = path.join(__dirname, '../../ethereum.csv');
  const ethData = fs.readFileSync(ethFilePath, 'utf8');
  const ethAddresses = ethData.split('\n').filter(line => line.trim() !== '');
  console.log(`Found ${ethAddresses.length} ETH addresses`);
  
  // Import BTC addresses
  let btcCount = 0;
  for (const address of btcAddresses) {
    try {
      // Check if address already exists
      const existingAddress = await CryptoAddress.findOne({ address, type: 'BTC' });
      if (!existingAddress) {
        const newAddress = new CryptoAddress({
          type: 'BTC',
          address,
          isAssigned: false
        });
        await newAddress.save();
        btcCount++;
      }
    } catch (error) {
      console.error(`Error importing BTC address ${address}:`, error);
    }
  }
  
  // Import ETH addresses
  let ethCount = 0;
  for (const address of ethAddresses) {
    try {
      // Check if address already exists
      const existingAddress = await CryptoAddress.findOne({ address, type: 'ETH' });
      if (!existingAddress) {
        const newAddress = new CryptoAddress({
          type: 'ETH',
          address,
          isAssigned: false
        });
        await newAddress.save();
        ethCount++;
      }
    } catch (error) {
      console.error(`Error importing ETH address ${address}:`, error);
    }
  }
  
  console.log(`Successfully imported ${btcCount} BTC addresses and ${ethCount} ETH addresses`);
  
  // Initialize exchange rate
  const ExchangeRate = require('../models/ExchangeRate');
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
  
  console.log('Import completed');
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
