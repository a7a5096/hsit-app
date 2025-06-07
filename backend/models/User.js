import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// A sub-schema to define the structure of bots owned by a user.
const OwnedBotSchema = new mongoose.Schema({
  botId: { type: String, required: true }, // The unique ID of the bot product, e.g., "aiBalancer05"
  name: { type: String, required: true },
  investmentAmount: { type: Number, required: true },
  purchasedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' }
}, { _id: false });


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
  // ADD THIS bots FIELD TO YOUR SCHEMA
  bots: {
    type: [OwnedBotSchema],
    default: []
  },
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
  // ... other fields like invitedBy, referralCode, etc.
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true 
});

// Pre-save hook to hash password (should already be there)
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare password (should already be there)
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

export default User;
