import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  phoneVerificationCode: {
    type: String
  },
  phoneVerificationExpires: {
    type: Date
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  verificationMethod: {
    type: String,
    enum: ['phone', 'email', 'none'],
    default: 'none'
  },
  btcAddress: {
    type: String,
    unique: true,
    sparse: true
  },
  ethAddress: {
    type: String,
    unique: true,
    sparse: true
  },
  balances: {
    btc: {
      type: Number,
      default: 0
    },
    eth: {
      type: Number,
      default: 0
    },
    usdt: {
      type: Number,
      default: 0
    },
    ubt: {
      type: Number,
      default: 0
    }
  },
  invitationCode: {
    type: String,
    unique: true
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  invitedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }],
  ubtBonusEarned: {
    type: Number,
    default: 0
  },
  botsPurchased: [{
    type: String,
    enum: ['100', '300', '500', '1000']
  }],
  qualifiedInvites: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Check if the model already exists before defining it
const User = mongoose.models.user || mongoose.model('user', UserSchema);

export default User;

