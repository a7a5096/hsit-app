import mongoose from 'mongoose';

const userAddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // Removed redundant index: true to fix duplicate index warning
  },
  addresses: {
    BTC: {
      address: String,
      assignedAt: Date,
      isActive: { type: Boolean, default: true }
    },
    ETH: {
      address: String,
      assignedAt: Date,
      isActive: { type: Boolean, default: true }
    },
    USDT: {
      address: String,
      assignedAt: Date,
      isActive: { type: Boolean, default: true }
    }
  },
  totalAssigned: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure one document per user
userAddressSchema.index({ userId: 1 }, { unique: true });

const UserAddress = mongoose.model('UserAddress', userAddressSchema);
export default UserAddress;
