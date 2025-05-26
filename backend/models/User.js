import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User schema with improved structure and removed redundancies
 */
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
  // Consolidated verification fields
  verification: {
    email: {
      verified: {
        type: Boolean,
        default: false
      },
      verifiedAt: {
        type: Date,
        default: null
      },
      token: {
        type: String,
        default: null
      },
      tokenExpires: {
        type: Date,
        default: null
      }
    },
    phone: {
      number: {
        type: String,
        default: null,
        sparse: true,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      },
      verifiedAt: {
        type: Date,
        default: null
      }
    }
  },
  // Standardized balances using Decimal128
  balances: {
    ubt: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00000000'),
      get: (v) => v ? parseFloat(v.toString()) : 0
    },
    btc: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00000000'),
      get: (v) => v ? parseFloat(v.toString()) : 0
    },
    eth: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00000000'),
      get: (v) => v ? parseFloat(v.toString()) : 0
    },
    usdt: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00000000'),
      get: (v) => v ? parseFloat(v.toString()) : 0
    }
  },
  // Improved daily sign-in tracking
  dailySignIn: {
    lastSignInDate: {
      type: Date,
      default: null
    },
    consecutiveDays: {
      type: Number,
      default: 0
    },
    totalRewards: {
      type: mongoose.Schema.Types.Decimal128,
      default: mongoose.Types.Decimal128.fromString('0.00000000'),
      get: (v) => v ? parseFloat(v.toString()) : 0
    },
    history: [{
      date: Date,
      reward: mongoose.Schema.Types.Decimal128
    }]
  },
  // Added role-based access control
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  // Improved timestamps
  timestamps: {
    created: {
      type: Date,
      default: Date.now
    },
    lastLogin: {
      type: Date,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Added status field
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  }
}, {
  // Enable getters for proper decimal conversion
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Update lastUpdated timestamp on save
UserSchema.pre('save', function(next) {
  this.timestamps.lastUpdated = new Date();
  next();
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

// Helper method to update balance
UserSchema.methods.updateBalance = async function(currency, amount) {
  currency = currency.toLowerCase();
  if (!this.balances[currency]) {
    throw new Error(`Invalid currency: ${currency}`);
  }
  
  const currentBalance = this.balances[currency] instanceof mongoose.Types.Decimal128 
    ? parseFloat(this.balances[currency].toString()) 
    : 0;
    
  const newBalance = currentBalance + parseFloat(amount);
  
  if (newBalance < 0) {
    throw new Error('Insufficient balance');
  }
  
  this.balances[currency] = mongoose.Types.Decimal128.fromString(newBalance.toFixed(8));
  return this.save();
};

// Helper method to record daily sign-in
UserSchema.methods.recordDailySignIn = async function(rewardAmount) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastSignIn = this.dailySignIn.lastSignInDate;
  let consecutiveDays = this.dailySignIn.consecutiveDays;
  
  // Check if this is a consecutive day
  if (lastSignIn) {
    const lastSignInDay = new Date(lastSignIn);
    lastSignInDay.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastSignInDay.getTime() === yesterday.getTime()) {
      consecutiveDays++;
    } else if (lastSignInDay.getTime() !== today.getTime()) {
      // Reset if not yesterday and not today (already signed in)
      consecutiveDays = 1;
    }
  } else {
    consecutiveDays = 1;
  }
  
  // Convert reward to Decimal128
  const reward = mongoose.Types.Decimal128.fromString(parseFloat(rewardAmount).toFixed(8));
  
  // Update sign-in data
  this.dailySignIn.lastSignInDate = today;
  this.dailySignIn.consecutiveDays = consecutiveDays;
  
  // Add to total rewards
  const currentTotal = this.dailySignIn.totalRewards instanceof mongoose.Types.Decimal128
    ? parseFloat(this.dailySignIn.totalRewards.toString())
    : 0;
  
  this.dailySignIn.totalRewards = mongoose.Types.Decimal128.fromString(
    (currentTotal + parseFloat(rewardAmount)).toFixed(8)
  );
  
  // Add to history
  this.dailySignIn.history.push({
    date: today,
    reward: reward
  });
  
  // Update last login timestamp
  this.timestamps.lastLogin = new Date();
  
  return this.save();
};

const User = mongoose.model('User', UserSchema);

export default User;
