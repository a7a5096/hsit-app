const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InvitationSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  usedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  usedAt: {
    type: Date
  },
  hasPurchasedBot: {
    type: Boolean,
    default: false
  },
  bonusPaid: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('invitation', InvitationSchema);
