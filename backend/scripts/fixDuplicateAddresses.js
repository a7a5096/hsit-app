#!/usr/bin/env node

const mongoose = require('mongoose');
const CryptoAddressService = require('../services/CryptoAddressService');
require('dotenv').config();

async function fixDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, import addresses if not already done
    console.log('Importing addresses...');
    await CryptoAddressService.importAddressesFromCSV();

    // Then fix duplicate assignments
    console.log('Fixing duplicate addresses...');
    const result = await CryptoAddressService.fixDuplicateAddresses();

    console.log('Fix completed!', result);

    // Show final stats
    const stats = await CryptoAddressService.getAddressStats();
    console.log('Final address statistics:', stats);

  } catch (error) {
    console.error('Fix failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixDuplicates();
