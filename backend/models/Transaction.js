import mongoose from 'mongoose';

/**
 * Enhanced Transaction schema with improved tracking capabilities
 */
const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  txHash: {
    type: String,
    required: true,
    unique: true
  },
  // Added toAddress field for complete transaction path
  toAddress: {
    type: String,
    required: true
  },
  fromAddress: {
    type: String,
    required: true
  },
  // Standardized to use Decimal128 for consistent precision
  amount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v) => v ? parseFloat(v.toString()) : 0
  },
  currency: {
    type: String,
    required: true,
    enum: ['BTC', 'ETH', 'USDT', 'UBT'],
    index: true
  },
  // Standardized to use Decimal128 for consistent precision
  ubtAmount: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v) => v ? parseFloat(v.toString()) : 0
  },
  // Added exchange rate at time of transaction for historical reference
  exchangeRate: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    get: (v) => v ? parseFloat(v.toString()) : 0
  },
  // Enhanced transaction relationship tracking
  relatedTransactions: [{
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    relationship: {
      type: String,
      enum: ['parent', 'child', 'conversion', 'fee', 'refund']
    }
  }],
  // Added batch processing support
  batchId: {
    type: String,
    default: null,
    index: true
  },
  // Enhanced status tracking
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Added detailed status information
  statusDetails: {
    type: String,
    default: ''
  },
  // Added status history for audit trail
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],
  // Added transaction type for better categorization
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer', 'conversion', 'reward', 'fee'],
    required: true,
    index: true
  },
  // Added metadata for flexible additional information
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Enhanced timestamp tracking
  timestamps: {
    created: {
      type: Date,
      default: Date.now,
      index: true
    },
    updated: {
      type: Date,
      default: Date.now
    },
    completed: {
      type: Date,
      default: null
    }
  }
}, {
  // Enable getters for proper decimal conversion
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Add compound indexes for common queries
TransactionSchema.index({ userId: 1, currency: 1 });
TransactionSchema.index({ userId: 1, status: 1 });
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ 'timestamps.created': -1 });

// Update timestamp on save
TransactionSchema.pre('save', function(next) {
  this.timestamps.updated = new Date();
  
  // If status is changing to completed, update completed timestamp
  if (this.isModified('status') && this.status === 'completed' && !this.timestamps.completed) {
    this.timestamps.completed = new Date();
    
    // Add to status history
    this.statusHistory.push({
      status: 'completed',
      timestamp: new Date(),
      notes: 'Transaction completed'
    });
  }
  
  next();
});

// Static method to find related transactions
TransactionSchema.statics.findRelatedTransactions = function(transactionId) {
  return this.findOne({ _id: transactionId })
    .then(transaction => {
      if (!transaction) return [];
      
      const relatedIds = transaction.relatedTransactions.map(rt => rt.transactionId);
      return this.find({
        $or: [
          { _id: { $in: relatedIds } },
          { 'relatedTransactions.transactionId': transactionId }
        ]
      }).sort({ 'timestamps.created': 1 });
    });
};

// Static method to find transactions by batch
TransactionSchema.statics.findByBatch = function(batchId) {
  return this.find({ batchId: batchId }).sort({ 'timestamps.created': 1 });
};

// Static method to create a transaction with proper decimal handling
TransactionSchema.statics.createTransaction = function(transactionData) {
  // Ensure decimal values are properly formatted
  if (typeof transactionData.amount === 'number') {
    transactionData.amount = mongoose.Types.Decimal128.fromString(transactionData.amount.toFixed(8));
  }
  
  if (typeof transactionData.ubtAmount === 'number') {
    transactionData.ubtAmount = mongoose.Types.Decimal128.fromString(transactionData.ubtAmount.toFixed(8));
  }
  
  if (typeof transactionData.exchangeRate === 'number') {
    transactionData.exchangeRate = mongoose.Types.Decimal128.fromString(transactionData.exchangeRate.toFixed(8));
  }
  
  // Initialize status history
  transactionData.statusHistory = [{
    status: transactionData.status || 'pending',
    timestamp: new Date(),
    notes: 'Transaction created'
  }];
  
  return this.create(transactionData);
};

// Method to update transaction status
TransactionSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    notes: notes
  });
  
  if (newStatus === 'completed' && !this.timestamps.completed) {
    this.timestamps.completed = new Date();
  }
  
  return this.save();
};

// Method to link related transactions
TransactionSchema.methods.linkTransaction = function(relatedTransactionId, relationship) {
  // Check if already linked
  const existingLink = this.relatedTransactions.find(
    rt => rt.transactionId.toString() === relatedTransactionId.toString()
  );
  
  if (!existingLink) {
    this.relatedTransactions.push({
      transactionId: relatedTransactionId,
      relationship: relationship
    });
  }
  
  return this.save();
};

const Transaction = mongoose.model('Transaction', TransactionSchema);

export default Transaction;
