import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import addressAssignmentService from './addressAssignmentService.js';
import { getCurrentUBTRate } from '../utils/ubtExchange.js';

/**
 * Service for tracking and processing deposits
 */
class DepositTrackingService {
  /**
   * Record a new deposit
   * @param {Object} depositData - Deposit data
   * @returns {Promise<Object>} - Transaction record
   */
  async recordDeposit(depositData) {
    const {
      userId,
      txHash,
      toAddress,
      fromAddress,
      amount,
      currency
    } = depositData;
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Verify the address belongs to the user
      const addressVerified = await addressAssignmentService.verifyAddressBelongsToUser(
        toAddress,
        userId
      );
      
      if (!addressVerified) {
        await session.abortTransaction();
        session.endSession();
        throw new Error('Deposit address does not belong to this user');
      }
      
      // Check if transaction already exists
      const existingTx = await Transaction.findOne({ txHash }).session(session);
      
      if (existingTx) {
        await session.abortTransaction();
        session.endSession();
        throw new Error('Transaction already processed');
      }
      
      // Get current UBT exchange rate
      const exchangeRate = await getCurrentUBTRate(currency);
      
      // Calculate UBT amount
      const ubtAmount = amount * exchangeRate;
      
      // Create transaction record
      const transaction = await Transaction.createTransaction({
        userId,
        txHash,
        toAddress,
        fromAddress,
        amount,
        currency,
        ubtAmount,
        exchangeRate,
        status: 'completed',
        type: 'deposit',
        statusHistory: [
          {
            status: 'completed',
            timestamp: new Date(),
            notes: 'Deposit recorded and processed'
          }
        ],
        timestamps: {
          created: new Date(),
          updated: new Date(),
          completed: new Date()
        }
      });
      
      await transaction.save({ session });
      
      // Update user's UBT balance
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: { 'balances.ubt': ubtAmount }
        },
        { session }
      );
      
      await session.commitTransaction();
      session.endSession();
      
      return transaction;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * Get deposits for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - List of deposits
   */
  async getUserDeposits(userId, filters = {}) {
    const query = {
      userId,
      type: 'deposit',
      ...filters
    };
    
    return Transaction.find(query).sort({ 'timestamps.created': -1 });
  }
  
  /**
   * Verify a deposit transaction
   * @param {string} txHash - Transaction hash
   * @param {string} currency - Currency type
   * @returns {Promise<Object>} - Verification result
   */
  async verifyDeposit(txHash, currency) {
    // In a real implementation, this would connect to blockchain APIs
    // to verify the transaction exists and has sufficient confirmations
    
    // For now, we'll simulate a successful verification
    return {
      verified: true,
      confirmations: 6,
      blockHeight: 12345678,
      timestamp: new Date()
    };
  }
}

export default new DepositTrackingService();
