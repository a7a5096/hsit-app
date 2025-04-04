const mongoose = require('mongoose');
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

module.exports = mongoose.model('exchangeRate', ExchangeRateSchema);
