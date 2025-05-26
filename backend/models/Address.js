import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['BTC', 'ETH', 'USDT'],
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
    notes: String
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
addressSchema.index({ currency: 1, isAssigned: 1, isActive: 1 });
addressSchema.index({ assignedTo: 1, currency: 1 });

const Address = mongoose.model('Address', addressSchema);
export default Address;
