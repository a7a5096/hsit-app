import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: false,
    trim: true
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  directInvitesCount: {
    type: Number,
    default: 0
  },
  secondLevelInvitesCount: {
    type: Number,
    default: 0
  },
  ubtBonusEarned: {
    type: Number,
    default: 0
  },
  botsPurchased: {
    type: Number,
    default: 0
  },
  walletAddresses: {
    bitcoin: { type: String, default: '' },
    ethereum: { type: String, default: '' },
    ubt: { type: String, default: '' }
  },
  // --- START Added balances object to schema ---
  balances: {
    btc: { type: mongoose.Schema.Types.Decimal128, default: () => new mongoose.Types.Decimal128("0.00") },
    eth: { type: mongoose.Schema.Types.Decimal128, default: () => new mongoose.Types.Decimal128("0.00") },
    usdt: { type: mongoose.Schema.Types.Decimal128, default: () => new mongoose.Types.Decimal128("0.00") },
    ubt: { type: mongoose.Schema.Types.Decimal128, default: () => new mongoose.Types.Decimal128("0.00") }
  },
  // --- END Added balances object to schema ---
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  passwordResetToken: {
    type: String,
    default: undefined
  },
  passwordResetExpires: {
    type: Date,
    default: undefined
  }
}, {
  timestamps: true
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('username')) {
    if (this.username && (!this.referralCode || this.referralCode !== this.username)) {
      this.referralCode = this.username;
    }
  }
  next();
});

const User = mongoose.model('User', UserSchema);

export default User;
