import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Define a schema for owned bots to be stored in the user's bot array
const OwnedBotSchema = new mongoose.Schema({
  botId: { type: String, required: true }, // Corresponds to the ID of the bot product
  name: { type: String, required: true },
  investmentAmount: { type: Number, required: true },
  purchasedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' } // e.g., 'active', 'expired'
}, { _id: false }); // No separate _id for subdocuments

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
  bots: [OwnedBotSchema], // <-- ADDED: Array to track owned bots
  walletAddresses: {
    bitcoin: { type: String, default: '' },
    ethereum: { type: String, default: '' },
    ubt: { type: String, default: '' }
  },
  balances: {
      bitcoin: { type: Number, default: 0 },
      ethereum: { type: Number, default: 0 },
      ubt: { type: Number, default: 0 },
      usdt: { type: Number, default: 0 }
  },
  // ... other fields from your existing schema (invitedBy, referralCode, etc.)
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

// Pre-save hook to hash password (should already be there)
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

// Method to compare password (should already be there)
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

export default User;
