import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const CryptoAddressSchema = new Schema({
  type: {
    type: String,
    enum: ['BTC', 'ETH', 'USDT'],
    required: true
  },
  address: {
    type: String,
    required: true,
    unique: true
  },
  isAssigned: {
    type: Boolean,
    default: false
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  assignedAt: {
    type: Date
  }
});

export default mongoose.model('cryptoAddress', CryptoAddressSchema);
