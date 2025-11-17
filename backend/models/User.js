import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// A sub-schema to define the structure of bots owned by a user.
const OwnedBotSchema = new mongoose.Schema({
  botId: { type: String, required: true }, // The unique ID of the bot product, e.g., "aiBalancer05"
  name: { type: String, required: true },
  investmentAmount: { type: Number, required: true },
  purchasedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'active' },
  completionDate: { type: Date }, // When the bot cycle completes
  totalPayout: { type: Number }, // Total amount to be paid out on completion
  payoutProcessed: { type: Boolean, default: false }, // Whether payout has been processed
  lockInDays: { type: Number } // Store lock-in period for completion calculation
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
  // Referral system fields
  invitationCode: {
    type: String,
    unique: true,
    sparse: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  qualifiedInvites: {
    type: Number,
    default: 0
  },
  ubtBonusEarned: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true 
});

// Pre-save hook to hash password and generate invitation code
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  // Auto-generate invitation code if not present
  if (this.isNew && !this.invitationCode) {
    this.invitationCode = generateInvitationCode();
  }
  
  next();
});

// Helper function to generate unique invitation code
function generateInvitationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Method to compare password (should already be there)
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

export default User;
