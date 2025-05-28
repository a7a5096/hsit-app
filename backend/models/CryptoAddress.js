import mongoose from 'mongoose';

const CryptoAddressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true
  },
  privateKey: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['bitcoin', 'ethereum', 'ubt']
  },
  used: {
    type: Boolean,
    default: false
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const CryptoAddress = mongoose.model('CryptoAddress', CryptoAddressSchema);

export default CryptoAddress;
