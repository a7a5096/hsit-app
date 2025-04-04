const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'purchase', 'bonus', 'exchange'],
    required: true
  },
  currency: {
    type: String,
    enum: ['BTC', 'ETH', 'USDT', 'UBT'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  walletAddress: {
    type: String
  },
  txHash: {
    type: String
  },
  exchangeRate: {
    type: Number
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('transaction', TransactionSchema);
