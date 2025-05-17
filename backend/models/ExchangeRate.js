import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ExchangeRateSchema = new Schema({
  withdrawalCount: {
    type: Number,
    default: 0
  },
  currentRate: {
    type: Number,
    default: 1.0
  },
  buyRate: {
    type: Number,
    default: 0.98
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Check if the model already exists before defining it
const ExchangeRate = mongoose.models.exchangeRate || mongoose.model('exchangeRate', ExchangeRateSchema);

export default ExchangeRate;
