import mongoose from 'mongoose';

/**
 * Consolidated schema for cryptocurrency addresses
 * Combines functionality from both Address.js and CryptoAddress.js
 */
const cryptoAddressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['BTC', 'ETH', 'USDT', 'UBT'],
    index: true
  },
  isAssigned: {
    type: Boolean,
    default: false,
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  assignedAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    importBatch: String,
    notes: String,
    source: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
cryptoAddressSchema.index({ currency: 1, isAssigned: 1, isActive: 1 });
cryptoAddressSchema.index({ assignedTo: 1, currency: 1 });

// Static method to find available address
cryptoAddressSchema.statics.findAvailableAddress = async function(currency) {
  return this.findOne({
    currency: currency,
    isAssigned: false,
    isActive: true
  }).sort({ createdAt: 1 });
};

// Static method to assign address to user
cryptoAddressSchema.statics.assignToUser = async function(addressId, userId) {
  return this.findByIdAndUpdate(
    addressId,
    {
      isAssigned: true,
      assignedTo: userId,
      assignedAt: new Date()
    },
    { new: true }
  );
};

const CryptoAddress = mongoose.model('CryptoAddress', cryptoAddressSchema);
export default CryptoAddress;
