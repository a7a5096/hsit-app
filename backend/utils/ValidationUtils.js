import mongoose from 'mongoose';

/**
 * Validation utility for schema validation and error handling
 */
class ValidationUtils {
  /**
   * Validate a cryptocurrency amount
   * @param {number|string} amount - Amount to validate
   * @param {number} minAmount - Minimum allowed amount
   * @returns {Object} - Validation result with success and error message
   */
  static validateCryptoAmount(amount, minAmount = 0) {
    try {
      // Convert to number for validation
      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      
      // Check if it's a valid number
      if (isNaN(numAmount)) {
        return {
          success: false,
          error: 'Invalid amount: must be a valid number'
        };
      }
      
      // Check minimum amount
      if (numAmount < minAmount) {
        return {
          success: false,
          error: `Amount must be at least ${minAmount}`
        };
      }
      
      // Convert to Decimal128 for storage
      const decimal128 = mongoose.Types.Decimal128.fromString(numAmount.toFixed(8));
      
      return {
        success: true,
        value: decimal128
      };
    } catch (error) {
      return {
        success: false,
        error: `Validation error: ${error.message}`
      };
    }
  }
  
  /**
   * Validate a cryptocurrency address format
   * @param {string} address - Address to validate
   * @param {string} currency - Currency type
   * @returns {Object} - Validation result with success and error message
   */
  static validateCryptoAddress(address, currency) {
    if (!address || typeof address !== 'string') {
      return {
        success: false,
        error: 'Address must be a non-empty string'
      };
    }
    
    // Basic format validation based on currency
    let isValid = false;
    let error = '';
    
    switch (currency.toUpperCase()) {
      case 'BTC':
        // Basic Bitcoin address validation (starts with 1, 3, or bc1)
        isValid = /^(1|3|bc1)[a-zA-Z0-9]{25,42}$/.test(address);
        error = 'Invalid Bitcoin address format';
        break;
        
      case 'ETH':
      case 'UBT':
        // Basic Ethereum address validation (0x followed by 40 hex chars)
        isValid = /^0x[a-fA-F0-9]{40}$/.test(address);
        error = 'Invalid Ethereum address format';
        break;
        
      case 'USDT':
        // USDT can be on multiple chains, so check both formats
        isValid = /^(0x[a-fA-F0-9]{40}|1|3|bc1)[a-zA-Z0-9]{25,42}$/.test(address);
        error = 'Invalid USDT address format';
        break;
        
      default:
        return {
          success: false,
          error: `Unsupported currency: ${currency}`
        };
    }
    
    return {
      success: isValid,
      error: isValid ? '' : error
    };
  }
  
  /**
   * Validate transaction data before creation
   * @param {Object} transactionData - Transaction data to validate
   * @returns {Object} - Validation result with success and error message
   */
  static validateTransaction(transactionData) {
    // Required fields check
    const requiredFields = ['userId', 'fromAddress', 'toAddress', 'amount', 'currency', 'type'];
    
    for (const field of requiredFields) {
      if (!transactionData[field]) {
        return {
          success: false,
          error: `Missing required field: ${field}`
        };
      }
    }
    
    // Validate amount
    const amountValidation = this.validateCryptoAmount(transactionData.amount);
    if (!amountValidation.success) {
      return amountValidation;
    }
    
    // Validate addresses
    const fromAddressValidation = this.validateCryptoAddress(
      transactionData.fromAddress, 
      transactionData.currency
    );
    
    if (!fromAddressValidation.success) {
      return {
        success: false,
        error: `Invalid from address: ${fromAddressValidation.error}`
      };
    }
    
    const toAddressValidation = this.validateCryptoAddress(
      transactionData.toAddress, 
      transactionData.currency
    );
    
    if (!toAddressValidation.success) {
      return {
        success: false,
        error: `Invalid to address: ${toAddressValidation.error}`
      };
    }
    
    // Validate transaction type
    const validTypes = ['deposit', 'withdrawal', 'transfer', 'conversion', 'reward', 'fee'];
    if (!validTypes.includes(transactionData.type)) {
      return {
        success: false,
        error: `Invalid transaction type: ${transactionData.type}`
      };
    }
    
    return {
      success: true,
      data: {
        ...transactionData,
        amount: amountValidation.value
      }
    };
  }
  
  /**
   * Handle database operation errors
   * @param {Error} error - Error object
   * @returns {Object} - Standardized error response
   */
  static handleDbError(error) {
    let errorResponse = {
      success: false,
      error: 'Database operation failed',
      details: error.message
    };
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      errorResponse.error = 'Validation failed';
      errorResponse.validationErrors = Object.keys(error.errors).reduce((errors, field) => {
        errors[field] = error.errors[field].message;
        return errors;
      }, {});
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      errorResponse.error = 'Duplicate key error';
      errorResponse.field = Object.keys(error.keyPattern)[0];
    }
    
    return errorResponse;
  }
  
  /**
   * Apply validation middleware to a schema
   * @param {mongoose.Schema} schema - Mongoose schema to enhance
   */
  static enhanceSchemaValidation(schema) {
    // Add validation for common fields
    if (schema.path('email')) {
      schema.path('email').validate(function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      }, 'Invalid email format');
    }
    
    if (schema.path('phoneNumber')) {
      schema.path('phoneNumber').validate(function(phone) {
        return !phone || /^\+?[1-9]\d{9,14}$/.test(phone);
      }, 'Invalid phone number format');
    }
    
    // Add error handling middleware
    schema.post('save', function(error, doc, next) {
      if (error.name === 'MongoServerError' && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        next(new Error(`${field} already exists`));
      } else {
        next(error);
      }
    });
    
    return schema;
  }
}

export default ValidationUtils;
