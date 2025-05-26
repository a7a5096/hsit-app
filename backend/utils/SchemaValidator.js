import mongoose from 'mongoose';
import ValidationUtils from '../utils/ValidationUtils.js';

/**
 * Database schema validation test utility
 * Tests all schema validations and error handling
 */
class SchemaValidator {
  /**
   * Run validation tests for all schemas
   * @returns {Object} - Test results
   */
  static async validateAllSchemas() {
    try {
      const results = {
        user: await this.validateUserSchema(),
        transaction: await this.validateTransactionSchema(),
        cryptoAddress: await this.validateCryptoAddressSchema(),
        overall: {
          success: true,
          message: 'All schema validations passed'
        }
      };
      
      // Check if any validations failed
      if (!results.user.success || !results.transaction.success || !results.cryptoAddress.success) {
        results.overall = {
          success: false,
          message: 'One or more schema validations failed'
        };
      }
      
      return results;
    } catch (error) {
      return {
        success: false,
        message: 'Schema validation failed',
        error: error.message
      };
    }
  }
  
  /**
   * Validate User schema
   * @returns {Object} - Validation results
   */
  static async validateUserSchema() {
    try {
      const User = mongoose.model('User');
      const results = {
        tests: [],
        success: true
      };
      
      // Test 1: Valid user creation
      try {
        const validUser = {
          username: `test_user_${Date.now()}`,
          email: `test_${Date.now()}@example.com`,
          password: 'Password123!'
        };
        
        const user = new User(validUser);
        await user.validate();
        
        results.tests.push({
          name: 'Valid user creation',
          success: true
        });
      } catch (error) {
        results.tests.push({
          name: 'Valid user creation',
          success: false,
          error: error.message
        });
        results.success = false;
      }
      
      // Test 2: Invalid email format
      try {
        const invalidUser = {
          username: `test_user_${Date.now()}`,
          email: 'invalid-email',
          password: 'Password123!'
        };
        
        const user = new User(invalidUser);
        await user.validate();
        
        results.tests.push({
          name: 'Invalid email validation',
          success: false,
          error: 'Validation should have failed'
        });
        results.success = false;
      } catch (error) {
        results.tests.push({
          name: 'Invalid email validation',
          success: true,
          message: 'Validation correctly failed'
        });
      }
      
      // Test 3: Balance update method
      try {
        const user = new User({
          username: `test_user_${Date.now()}`,
          email: `test_${Date.now()}@example.com`,
          password: 'Password123!'
        });
        
        // Test balance update method
        user.balances.ubt = mongoose.Types.Decimal128.fromString('10.00000000');
        const updateResult = await user.updateBalance('ubt', 5);
        
        const newBalance = parseFloat(updateResult.balances.ubt.toString());
        
        results.tests.push({
          name: 'Balance update method',
          success: newBalance === 15,
          message: newBalance === 15 ? 'Balance updated correctly' : `Balance incorrect: ${newBalance}`
        });
        
        if (newBalance !== 15) {
          results.success = false;
        }
      } catch (error) {
        results.tests.push({
          name: 'Balance update method',
          success: false,
          error: error.message
        });
        results.success = false;
      }
      
      return results;
    } catch (error) {
      return {
        success: false,
        message: 'User schema validation failed',
        error: error.message
      };
    }
  }
  
  /**
   * Validate Transaction schema
   * @returns {Object} - Validation results
   */
  static async validateTransactionSchema() {
    try {
      const Transaction = mongoose.model('Transaction');
      const results = {
        tests: [],
        success: true
      };
      
      // Test 1: Valid transaction creation
      try {
        const validTransaction = {
          userId: new mongoose.Types.ObjectId(),
          txHash: `tx_${Date.now()}`,
          fromAddress: '0x1234567890123456789012345678901234567890',
          toAddress: '0x0987654321098765432109876543210987654321',
          amount: mongoose.Types.Decimal128.fromString('1.00000000'),
          currency: 'ETH',
          ubtAmount: mongoose.Types.Decimal128.fromString('10.00000000'),
          exchangeRate: mongoose.Types.Decimal128.fromString('10.00000000'),
          type: 'deposit',
          status: 'pending'
        };
        
        const transaction = new Transaction(validTransaction);
        await transaction.validate();
        
        results.tests.push({
          name: 'Valid transaction creation',
          success: true
        });
      } catch (error) {
        results.tests.push({
          name: 'Valid transaction creation',
          success: false,
          error: error.message
        });
        results.success = false;
      }
      
      // Test 2: Invalid currency
      try {
        const invalidTransaction = {
          userId: new mongoose.Types.ObjectId(),
          txHash: `tx_${Date.now()}`,
          fromAddress: '0x1234567890123456789012345678901234567890',
          toAddress: '0x0987654321098765432109876543210987654321',
          amount: mongoose.Types.Decimal128.fromString('1.00000000'),
          currency: 'INVALID',
          ubtAmount: mongoose.Types.Decimal128.fromString('10.00000000'),
          exchangeRate: mongoose.Types.Decimal128.fromString('10.00000000'),
          type: 'deposit',
          status: 'pending'
        };
        
        const transaction = new Transaction(invalidTransaction);
        await transaction.validate();
        
        results.tests.push({
          name: 'Invalid currency validation',
          success: false,
          error: 'Validation should have failed'
        });
        results.success = false;
      } catch (error) {
        results.tests.push({
          name: 'Invalid currency validation',
          success: true,
          message: 'Validation correctly failed'
        });
      }
      
      // Test 3: Transaction status update
      try {
        const transaction = new Transaction({
          userId: new mongoose.Types.ObjectId(),
          txHash: `tx_${Date.now()}`,
          fromAddress: '0x1234567890123456789012345678901234567890',
          toAddress: '0x0987654321098765432109876543210987654321',
          amount: mongoose.Types.Decimal128.fromString('1.00000000'),
          currency: 'ETH',
          ubtAmount: mongoose.Types.Decimal128.fromString('10.00000000'),
          exchangeRate: mongoose.Types.Decimal128.fromString('10.00000000'),
          type: 'deposit',
          status: 'pending'
        });
        
        // Save to get an ID
        await transaction.save();
        
        // Test status update method
        await transaction.updateStatus('completed', 'Test completion');
        
        results.tests.push({
          name: 'Transaction status update',
          success: transaction.status === 'completed' && transaction.statusHistory.length === 2,
          message: transaction.status === 'completed' ? 'Status updated correctly' : `Status incorrect: ${transaction.status}`
        });
        
        if (transaction.status !== 'completed' || transaction.statusHistory.length !== 2) {
          results.success = false;
        }
        
        // Clean up
        await Transaction.deleteOne({ _id: transaction._id });
      } catch (error) {
        results.tests.push({
          name: 'Transaction status update',
          success: false,
          error: error.message
        });
        results.success = false;
      }
      
      return results;
    } catch (error) {
      return {
        success: false,
        message: 'Transaction schema validation failed',
        error: error.message
      };
    }
  }
  
  /**
   * Validate CryptoAddress schema
   * @returns {Object} - Validation results
   */
  static async validateCryptoAddressSchema() {
    try {
      const CryptoAddress = mongoose.model('CryptoAddress');
      const results = {
        tests: [],
        success: true
      };
      
      // Test 1: Valid address creation
      try {
        const validAddress = {
          address: `0x${Date.now()}1234567890123456789012345678901234`,
          currency: 'ETH',
          isAssigned: false,
          isActive: true
        };
        
        const address = new CryptoAddress(validAddress);
        await address.validate();
        
        results.tests.push({
          name: 'Valid address creation',
          success: true
        });
      } catch (error) {
        results.tests.push({
          name: 'Valid address creation',
          success: false,
          error: error.message
        });
        results.success = false;
      }
      
      // Test 2: Invalid currency
      try {
        const invalidAddress = {
          address: `0x${Date.now()}1234567890123456789012345678901234`,
          currency: 'INVALID',
          isAssigned: false,
          isActive: true
        };
        
        const address = new CryptoAddress(invalidAddress);
        await address.validate();
        
        results.tests.push({
          name: 'Invalid currency validation',
          success: false,
          error: 'Validation should have failed'
        });
        results.success = false;
      } catch (error) {
        results.tests.push({
          name: 'Invalid currency validation',
          success: true,
          message: 'Validation correctly failed'
        });
      }
      
      // Test 3: Address assignment
      try {
        const address = new CryptoAddress({
          address: `0x${Date.now()}1234567890123456789012345678901234`,
          currency: 'ETH',
          isAssigned: false,
          isActive: true
        });
        
        // Save to get an ID
        await address.save();
        
        // Test assignment method
        const userId = new mongoose.Types.ObjectId();
        const updatedAddress = await CryptoAddress.assignToUser(address._id, userId);
        
        results.tests.push({
          name: 'Address assignment',
          success: updatedAddress.isAssigned === true && updatedAddress.assignedTo.equals(userId),
          message: updatedAddress.isAssigned ? 'Address assigned correctly' : 'Assignment failed'
        });
        
        if (!updatedAddress.isAssigned || !updatedAddress.assignedTo.equals(userId)) {
          results.success = false;
        }
        
        // Clean up
        await CryptoAddress.deleteOne({ _id: address._id });
      } catch (error) {
        results.tests.push({
          name: 'Address assignment',
          success: false,
          error: error.message
        });
        results.success = false;
      }
      
      return results;
    } catch (error) {
      return {
        success: false,
        message: 'CryptoAddress schema validation failed',
        error: error.message
      };
    }
  }
}

export default SchemaValidator;
