/**
 * UBT Exchange Rate and Conversion Logic
 * 
 * This file handles the UBT token exchange rate calculations and conversions
 * from crypto deposits to UBT tokens.
 */

// Import required modules
import mongoose from 'mongoose';
import User from '../models/User.js';
import ExchangeRate from '../models/ExchangeRate.js';

/**
 * Get the current UBT exchange rate
 * @returns {Promise<number>} The current UBT exchange rate
 */
async function getCurrentUBTRate() {
  try {
    // Get the latest exchange rate from the database
    const latestRate = await ExchangeRate.findOne().sort({ timestamp: -1 });
    
    // If no rate exists, use the initial rate from environment variables
    if (!latestRate) {
      const initialRate = parseFloat(process.env.UBT_INITIAL_EXCHANGE_RATE) || 1.0;
      
      // Create initial rate record
      const newRate = new ExchangeRate({
        rate: initialRate,
        timestamp: Date.now()
      });
      await newRate.save();
      
      return initialRate;
    }
    
    return latestRate.rate;
  } catch (err) {
    console.error('Error getting UBT rate:', err);
    // Default to 1.0 if there's an error
    return 1.0;
  }
}

/**
 * Increase the UBT exchange rate by the specified percentage
 * @returns {Promise<number>} The new UBT exchange rate
 */
async function increaseUBTRate() {
  try {
    // Get current rate
    const currentRate = await getCurrentUBTRate();
    
    // Calculate increase percentage from environment variable (default to 0.5%)
    const increasePercentage = parseFloat(process.env.UBT_RATE_INCREASE) || 0.005;
    
    // Calculate new rate
    const newRate = currentRate * (1 + increasePercentage);
    
    // Save new rate to database
    const rateRecord = new ExchangeRate({
      rate: newRate,
      timestamp: Date.now()
    });
    await rateRecord.save();
    
    return newRate;
  } catch (err) {
    console.error('Error increasing UBT rate:', err);
    throw err;
  }
}

/**
 * Convert crypto amount to UBT
 * @param {string} cryptoType - The type of cryptocurrency (BTC, ETH, USDT)
 * @param {number} amount - The amount of cryptocurrency
 * @returns {Promise<{ubtAmount: number, newRate: number}>} The converted UBT amount and new exchange rate
 */
async function convertToUBT(cryptoType, amount) {
  try {
    // Get current UBT rate
    const currentRate = await getCurrentUBTRate();
    
    // Convert to UBT based on crypto type
    let usdtEquivalent = 0;
    
    // These conversion rates would typically come from an external API
    // For simplicity, we're using hardcoded values
    switch (cryptoType.toUpperCase()) {
      case 'BTC':
        // Assuming 1 BTC = 50,000 USDT (this would be dynamic in production)
        usdtEquivalent = amount * 50000;
        break;
      case 'ETH':
        // Assuming 1 ETH = 3,000 USDT (this would be dynamic in production)
        usdtEquivalent = amount * 3000;
        break;
      case 'USDT':
        usdtEquivalent = amount;
        break;
      default:
        throw new Error(`Unsupported crypto type: ${cryptoType}`);
    }
    
    // Convert USDT equivalent to UBT
    const ubtAmount = usdtEquivalent * currentRate;
    
    // Increase UBT rate after conversion
    const newRate = await increaseUBTRate();
    
    return {
      ubtAmount,
      newRate
    };
  } catch (err) {
    console.error('Error converting to UBT:', err);
    throw err;
  }
}

/**
 * Process a deposit and convert to UBT
 * @param {string} userId - The user ID
 * @param {string} cryptoType - The type of cryptocurrency (BTC, ETH, USDT)
 * @param {number} amount - The amount of cryptocurrency
 * @returns {Promise<{ubtAmount: number, newBalance: number, newRate: number}>} The result of the deposit
 */
async function processDeposit(userId, cryptoType, amount) {
  try {
    // Convert to UBT
    const { ubtAmount, newRate } = await convertToUBT(cryptoType, amount);
    
    // Update user's UBT balance
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Update the appropriate crypto balance for record-keeping (not shown to user)
    switch (cryptoType.toUpperCase()) {
      case 'BTC':
        user.balances.btc += amount;
        break;
      case 'ETH':
        user.balances.eth += amount;
        break;
      case 'USDT':
        user.balances.usdt += amount;
        break;
    }
    
    // Add UBT to user's balance
    user.balances.ubt += ubtAmount;
    
    // Save user
    await user.save();
    
    return {
      ubtAmount,
      newBalance: user.balances.ubt,
      newRate
    };
  } catch (err) {
    console.error('Error processing deposit:', err);
    throw err;
  }
}

/**
 * Process a UBT transaction (spend or transfer)
 * @param {string} userId - The user ID
 * @param {number} amount - The amount of UBT
 * @param {string} transactionType - The type of transaction
 * @returns {Promise<{newBalance: number, newRate: number}>} The result of the transaction
 */
async function processUBTTransaction(userId, amount, transactionType) {
  try {
    // Verify user has enough UBT
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    if (user.balances.ubt < amount) {
      throw new Error('Insufficient UBT balance');
    }
    
    // Deduct UBT from user's balance
    user.balances.ubt -= amount;
    
    // Save user
    await user.save();
    
    // Increase UBT rate after transaction
    const newRate = await increaseUBTRate();
    
    return {
      newBalance: user.balances.ubt,
      newRate
    };
  } catch (err) {
    console.error('Error processing UBT transaction:', err);
    throw err;
  }
}

export {
  getCurrentUBTRate,
  increaseUBTRate,
  convertToUBT,
  processDeposit,
  processUBTTransaction
};
