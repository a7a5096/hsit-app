import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  txHash: {
    type: String,
    required: true,
    unique: true
  },
  fromAddress: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['BTC', 'ETH', 'UBT', 'USDT'], // Added USDT to support all currencies
    uppercase: true // Automatically convert currency to uppercase
  },
  ubtAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'reward', 'wager'],
    default: 'deposit'
  },
  description: {
    type: String,
    default: ''
  },
  relatedAddress: {
    type: String,
    default: ''
  }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

export default Transaction;
