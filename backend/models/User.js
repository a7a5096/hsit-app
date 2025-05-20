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
    required: true,
    unique: true,
    trim: true
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  walletAddresses: {
    bitcoin: {
      type: String,
      default: ''
    },
    ethereum: {
      type: String,
      default: ''
    },
    ubt: {
      type: String,
      default: ''
    }
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
      default: 100
    }
  },
  cryptoBalance: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  lastSignIn: {
    type: Date
  },
  consecutiveDays: {
    type: Number,
    default: 0
  }
});

// Password hash middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

export default User;
