import mongoose from 'mongoose';

const ExchangeRateSchema = new mongoose.Schema({
  fromCurrency: {
    type: String,
    required: true,
    trim: true
  },
  toCurrency: {
    type: String,
    required: true,
    trim: true
  },
  rate: {
    type: Number,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for currency pair
ExchangeRateSchema.index({ fromCurrency: 1, toCurrency: 1 }, { unique: true });

const ExchangeRate = mongoose.model('ExchangeRate', ExchangeRateSchema);

export default ExchangeRate;
