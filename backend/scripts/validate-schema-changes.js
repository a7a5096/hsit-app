import mongoose from 'mongoose';
import SchemaValidator from './SchemaValidator.js';

/**
 * Test script to validate all schema changes and data consistency
 */
async function validateSchemaChanges() {
  try {
    console.log('Starting schema validation tests...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
    
    // Run all schema validations
    const results = await SchemaValidator.validateAllSchemas();
    
    console.log('\n=== VALIDATION RESULTS ===');
    console.log(`Overall: ${results.overall.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(results.overall.message);
    
    // User schema results
    console.log('\n--- User Schema ---');
    console.log(`Status: ${results.user.success ? 'SUCCESS' : 'FAILED'}`);
    results.user.tests.forEach(test => {
      console.log(`- ${test.name}: ${test.success ? 'PASSED' : 'FAILED'}`);
      if (!test.success && test.error) {
        console.log(`  Error: ${test.error}`);
      }
    });
    
    // Transaction schema results
    console.log('\n--- Transaction Schema ---');
    console.log(`Status: ${results.transaction.success ? 'SUCCESS' : 'FAILED'}`);
    results.transaction.tests.forEach(test => {
      console.log(`- ${test.name}: ${test.success ? 'PASSED' : 'FAILED'}`);
      if (!test.success && test.error) {
        console.log(`  Error: ${test.error}`);
      }
    });
    
    // CryptoAddress schema results
    console.log('\n--- CryptoAddress Schema ---');
    console.log(`Status: ${results.cryptoAddress.success ? 'SUCCESS' : 'FAILED'}`);
    results.cryptoAddress.tests.forEach(test => {
      console.log(`- ${test.name}: ${test.success ? 'PASSED' : 'FAILED'}`);
      if (!test.success && test.error) {
        console.log(`  Error: ${test.error}`);
      }
    });
    
    console.log('\nValidation complete!');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
    // Return overall result
    return results.overall.success;
  } catch (error) {
    console.error('Validation failed with error:', error);
    
    // Ensure MongoDB connection is closed
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    return false;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateSchemaChanges()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default validateSchemaChanges;
