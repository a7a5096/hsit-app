import mongoose from 'mongoose';

const DailySignInSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  reward: {
    type: Number,
    required: true
  },
  consecutiveDays: {
    type: Number,
    default: 1
  }
});

// Create index for efficient querying by user and date
DailySignInSchema.index({ userId: 1, date: 1 });

const DailySignIn = mongoose.model('DailySignIn', DailySignInSchema);

export default DailySignIn;
