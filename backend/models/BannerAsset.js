import mongoose from 'mongoose';

const BannerAssetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    enum: ['background', 'foreground', 'overlay'],
    default: 'background'
  },
  path: {
    type: String,
    required: true,
    trim: true
  },
  page: {
    type: String,
    required: true,
    trim: true,
    default: 'dashboard'
  },
  active: {
    type: Boolean,
    default: true
  },
  zIndex: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
BannerAssetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const BannerAsset = mongoose.model('BannerAsset', BannerAssetSchema);

export default BannerAsset;
