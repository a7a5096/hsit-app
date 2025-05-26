#!/usr/bin/env node

const mongoose = require('mongoose');
const AddressService = require('../services/AddressService');
require('dotenv').config();

async function setupAddresses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hsit-app');
    console.log('Connected to MongoDB');

    // Import addresses from CSV files
    console.log('Starting address import...');
    const importResults = await AddressService.importAddressesFromCSV();
    
    console.log('Import completed:', importResults);

    // Get statistics
    const stats = await AddressService.getAddressStats();
    console.log('Address Statistics:', stats);

    // Optionally assign to existing users
    const assignToExisting = process.argv.includes('--assign-existing');
    if (assignToExisting) {
      console.log('Assigning addresses to existing users...');
      const bulkResults = await AddressService.bulkAssignToExistingUsers();
      console.log(`Assigned addresses to ${bulkResults.length} users`);
    }

    console.log('Setup completed successfully!');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupAddresses();
}

module.exports = setupAddresses;
