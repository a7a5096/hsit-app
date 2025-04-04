const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CryptoAddressSchema = new Schema({
  type: {
    type: String,
    enum: ['BTC', 'ETH'],
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

module.exports = mongoose.model('cryptoAddress', CryptoAddressSchema);
