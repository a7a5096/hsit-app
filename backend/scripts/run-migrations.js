import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Migration script to apply all schema changes
 * This script should be run after deploying the new schema files
 */

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  runMigrations();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Run migrations in sequence
    await migrateAddresses();
    await standardizeBalances();
    await enhanceTransactions();
    
    console.log('\nAll migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Migrate addresses from old models to consolidated CryptoAddress model
 */
async function migrateAddresses() {
  console.log('\n--- Migrating Addresses ---');
  
  try {
    // Get models
    const OldAddress = mongoose.model('Address');
    const OldCryptoAddress = mongoose.model('cryptoAddress');
    const NewCryptoAddress = mongoose.model('CryptoAddress');
    
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
        } else {
          cryptoSkippedCount++;
        }
      } catch (error) {
        console.error(`Error migrating crypto address ${oldAddr.address}:`, error.message);
      }
    }
    
    console.log('Address migration complete!');
    console.log(`- Address model: ${migratedCount} migrated, ${skippedCount} skipped`);
    console.log(`- CryptoAddress model: ${cryptoMigratedCount} migrated, ${cryptoSkippedCount} skipped`);
    console.log(`- Total: ${migratedCount + cryptoMigratedCount} migrated, ${skippedCount + cryptoSkippedCount} skipped`);
    
    return true;
  } catch (error) {
    console.error('Address migration failed:', error);
    throw error;
  }
}

/**
 * Standardize cryptocurrency balances to use Decimal128
 */
async function standardizeBalances() {
  console.log('\n--- Standardizing Balances ---');
  
  try {
    // Get User model
    const User = mongoose.model('User');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to update`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      try {
        let updated = false;
        
        // Convert balances.ubt to Decimal128 if it's a Number
        if (user.balances && user.balances.ubt !== undefined && !(user.balances.ubt instanceof mongoose.Types.Decimal128)) {
          const ubtValue = parseFloat(user.balances.ubt || 0).toFixed(8);
          user.balances.ubt = mongoose.Types.Decimal128.fromString(ubtValue);
          updated = true;
        }
        
        // Initialize other balances if they don't exist
        if (!user.balances) {
          user.balances = {};
        }
        
        if (user.balances.btc === undefined) {
          user.balances.btc = mongoose.Types.Decimal128.fromString('0.00000000');
          updated = true;
        } else if (!(user.balances.btc instanceof mongoose.Types.Decimal128)) {
          const btcValue = parseFloat(user.balances.btc || 0).toFixed(8);
          user.balances.btc = mongoose.Types.Decimal128.fromString(btcValue);
          updated = true;
        }
        
        if (user.balances.eth === undefined) {
          user.balances.eth = mongoose.Types.Decimal128.fromString('0.00000000');
          updated = true;
        } else if (!(user.balances.eth instanceof mongoose.Types.Decimal128)) {
          const ethValue = parseFloat(user.balances.eth || 0).toFixed(8);
          user.balances.eth = mongoose.Types.Decimal128.fromString(ethValue);
          updated = true;
        }
        
        if (user.balances.usdt === undefined) {
          user.balances.usdt = mongoose.Types.Decimal128.fromString('0.00000000');
          updated = true;
        } else if (!(user.balances.usdt instanceof mongoose.Types.Decimal128)) {
          const usdtValue = parseFloat(user.balances.usdt || 0).toFixed(8);
          user.balances.usdt = mongoose.Types.Decimal128.fromString(usdtValue);
          updated = true;
        }
        
        // Convert cryptoBalance to appropriate balance field if it exists
        if (user.cryptoBalance !== undefined) {
          // Assume cryptoBalance is UBT if not specified
          if (!user.balances.ubt || parseFloat(user.balances.ubt.toString()) === 0) {
            const cryptoValue = parseFloat(user.cryptoBalance || 0).toFixed(8);
            user.balances.ubt = mongoose.Types.Decimal128.fromString(cryptoValue);
            updated = true;
          }
        }
        
        // Convert dailySignIn.totalRewards to Decimal128 if it exists
        if (user.dailySignIn && user.dailySignIn.totalRewards !== undefined && 
            !(user.dailySignIn.totalRewards instanceof mongoose.Types.Decimal128)) {
          const rewardsValue = parseFloat(user.dailySignIn.totalRewards || 0).toFixed(8);
          user.dailySignIn.totalRewards = mongoose.Types.Decimal128.fromString(rewardsValue);
          updated = true;
        }
        
        if (updated) {
          await user.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error updating user ${user._id}:`, error.message);
      }
    }
    
    console.log('Balance standardization complete!');
    console.log(`- ${updatedCount} users updated`);
    console.log(`- ${skippedCount} users skipped (already standardized)`);
    
    return true;
  } catch (error) {
    console.error('Balance standardization failed:', error);
    throw error;
  }
}

/**
 * Enhance transactions with new fields and standardized values
 */
async function enhanceTransactions() {
  console.log('\n--- Enhancing Transactions ---');
  
  try {
    // Get Transaction model
    const Transaction = mongoose.model('Transaction');
    
    // Find all transactions
    const transactions = await Transaction.find({});
    console.log(`Found ${transactions.length} transactions to enhance`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const tx of transactions) {
      try {
        let updated = false;
        
        // Convert amount to Decimal128 if it's a Number
        if (tx.amount !== undefined && !(tx.amount instanceof mongoose.Types.Decimal128)) {
          const amountValue = parseFloat(tx.amount || 0).toFixed(8);
          tx.amount = mongoose.Types.Decimal128.fromString(amountValue);
          updated = true;
        }
        
        // Convert ubtAmount to Decimal128 if it's a Number
        if (tx.ubtAmount !== undefined && !(tx.ubtAmount instanceof mongoose.Types.Decimal128)) {
          const ubtValue = parseFloat(tx.ubtAmount || 0).toFixed(8);
          tx.ubtAmount = mongoose.Types.Decimal128.fromString(ubtValue);
          updated = true;
        }
        
        // Add exchangeRate if it doesn't exist
        if (tx.exchangeRate === undefined) {
          // Calculate from amount and ubtAmount if possible
          if (tx.amount && tx.ubtAmount && parseFloat(tx.amount.toString()) > 0) {
            const rate = parseFloat(tx.ubtAmount.toString()) / parseFloat(tx.amount.toString());
            tx.exchangeRate = mongoose.Types.Decimal128.fromString(rate.toFixed(8));
          } else {
            // Default to 1:1 if can't calculate
            tx.exchangeRate = mongoose.Types.Decimal128.fromString('1.00000000');
          }
          updated = true;
        }
        
        // Add toAddress if it doesn't exist
        if (!tx.toAddress) {
          // Use a placeholder address if not available
          tx.toAddress = tx.fromAddress || 'unknown';
          updated = true;
        }
        
        // Add transaction type if it doesn't exist
        if (!tx.type) {
          // Infer type from existing data
          if (tx.currency === 'UBT' && parseFloat(tx.ubtAmount.toString()) > 0) {
            tx.type = 'deposit';
          } else {
            tx.type = 'transfer';
          }
          updated = true;
        }
        
        // Initialize status history if it doesn't exist
        if (!tx.statusHistory || tx.statusHistory.length === 0) {
          tx.statusHistory = [{
            status: tx.status || 'pending',
            timestamp: tx.timestamp || new Date(),
            notes: 'Status initialized during migration'
          }];
          updated = true;
        }
        
        // Initialize timestamps if they don't exist
        if (!tx.timestamps) {
          tx.timestamps = {
            created: tx.timestamp || new Date(),
            updated: new Date()
          };
          
          if (tx.status === 'completed') {
            tx.timestamps.completed = tx.timestamp || new Date();
          }
          
          updated = true;
        }
        
        if (updated) {
          await tx.save();
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error enhancing transaction ${tx._id}:`, error.message);
      }
    }
    
    console.log('Transaction enhancement complete!');
    console.log(`- ${updatedCount} transactions updated`);
    console.log(`- ${skippedCount} transactions skipped (already enhanced)`);
    
    return true;
  } catch (error) {
    console.error('Transaction enhancement failed:', error);
    throw error;
  }
}
