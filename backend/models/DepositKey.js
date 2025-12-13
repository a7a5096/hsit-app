import mongoose from 'mongoose';

const DepositKeySchema = new mongoose.Schema({
  publicAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  privateKey: {
    type: String,
    required: true,
    trim: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['BTC', 'ETH', 'USDT', 'UBT'],
    uppercase: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date
  },
  isAssigned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'deposit_keys' // "Separate area"
});

// Index for efficient finding of unassigned keys
DepositKeySchema.index({ currency: 1, isAssigned: 1 });

const DepositKey = mongoose.model('DepositKey', DepositKeySchema);

export default DepositKey;
