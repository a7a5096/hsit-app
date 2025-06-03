import mongoose from 'mongoose';

const CryptoAssetSchema = new mongoose.Schema({
  pair: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
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
  source: {
    type: String,
    enum: ['primary', 'fallback', 'placeholder', 'api_direct', 'manual'],
    default: 'api_direct'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const CryptoAsset = mongoose.model('CryptoAsset', CryptoAssetSchema);

export default CryptoAsset;
