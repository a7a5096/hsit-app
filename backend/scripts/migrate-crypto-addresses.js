import mongoose from 'mongoose';

/**
 * Migration script to consolidate Address and CryptoAddress models
 * This script should be run after deploying the new schema changes
 */

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  migrateAddresses();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function migrateAddresses() {
  try {
    // Get both models
    const OldAddress = mongoose.model('Address');
    const OldCryptoAddress = mongoose.model('cryptoAddress');
    const NewCryptoAddress = mongoose.model('CryptoAddress');
    
    console.log('Starting address migration...');
    
    // Migrate from Address model
    const oldAddresses = await OldAddress.find({});
    console.log(`Found ${oldAddresses.length} addresses in old Address model`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const oldAddr of oldAddresses) {
      try {
        // Check if address already exists in new model
        const exists = await NewCryptoAddress.findOne({ address: oldAddr.address });
        
        if (!exists) {
          // Create new document in consolidated model
          await NewCryptoAddress.create({
            address: oldAddr.address,
            currency: oldAddr.currency,
            isAssigned: oldAddr.isAssigned,
            assignedTo: oldAddr.assignedTo,
            assignedAt: oldAddr.assignedAt,
            isActive: oldAddr.isActive,
            metadata: {
              importBatch: oldAddr.metadata?.importBatch || 'migration',
              notes: oldAddr.metadata?.notes || '',
              source: 'Address model migration'
            },
            createdAt: oldAddr.createdAt || new Date(),
            updatedAt: oldAddr.updatedAt || new Date()
          });
          
          migratedCount++;
          if (migratedCount % 100 === 0) {
            console.log(`Migrated ${migratedCount} addresses so far...`);
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error migrating address ${oldAddr.address}:`, error.message);
      }
    }
    
    // Migrate from CryptoAddress model
    const oldCryptoAddresses = await OldCryptoAddress.find({});
    console.log(`Found ${oldCryptoAddresses.length} addresses in old CryptoAddress model`);
    
    let cryptoMigratedCount = 0;
    let cryptoSkippedCount = 0;
    
    for (const oldAddr of oldCryptoAddresses) {
      try {
        // Check if address already exists in new model
        const exists = await NewCryptoAddress.findOne({ address: oldAddr.address });
        
        if (!exists) {
          // Create new document in consolidated model
          await NewCryptoAddress.create({
            address: oldAddr.address,
            currency: oldAddr.type,
            isAssigned: oldAddr.isAssigned,
            assignedTo: oldAddr.assignedTo,
            assignedAt: oldAddr.assignedAt,
            isActive: true,
            metadata: {
              importBatch: 'migration',
              notes: '',
              source: 'CryptoAddress model migration'
            }
          });
          
          cryptoMigratedCount++;
          if (cryptoMigratedCount % 100 === 0) {
            console.log(`Migrated ${cryptoMigratedCount} crypto addresses so far...`);
          }
        } else {
          cryptoSkippedCount++;
        }
      } catch (error) {
        console.error(`Error migrating crypto address ${oldAddr.address}:`, error.message);
      }
    }
    
    console.log('\nMigration complete!');
    console.log('Summary:');
    console.log(`- Address model: ${migratedCount} migrated, ${skippedCount} skipped`);
    console.log(`- CryptoAddress model: ${cryptoMigratedCount} migrated, ${cryptoSkippedCount} skipped`);
    console.log(`- Total: ${migratedCount + cryptoMigratedCount} migrated, ${skippedCount + cryptoSkippedCount} skipped`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}
