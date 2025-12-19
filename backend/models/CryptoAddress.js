import mongoose from 'mongoose';
import { obfuscatePrivateKey, deobfuscatePrivateKey } from '../utils/privateKeyObfuscation.js';

const CryptoAddressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true
  },
  privateKey: {
    type: String,
    required: false // Modified to make privateKey optional
  },
  currency: {
    type: String,
    required: true,
    enum: ['bitcoin', 'ethereum', 'ubt']
  },
  used: {
    type: Boolean,
    default: false
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Obfuscate private key before saving (reverse characters)
CryptoAddressSchema.pre('save', function(next) {
  if (this.isModified('privateKey') && this.privateKey) {
    // Check if already obfuscated by trying to deobfuscate and see if it changes
    const deobfuscated = deobfuscatePrivateKey(this.privateKey);
    // If deobfuscating doesn't change it, it means it's already obfuscated
    // (this happens if the key is a palindrome, but that's extremely rare)
    // For safety, we'll check: if the original equals the double-reverse, it's likely obfuscated
    const doubleReverse = deobfuscatePrivateKey(deobfuscatePrivateKey(this.privateKey));
    if (doubleReverse !== this.privateKey) {
      // Not obfuscated yet, obfuscate it
      this.privateKey = obfuscatePrivateKey(this.privateKey);
    }
    // If doubleReverse === this.privateKey, it's already obfuscated, leave it as is
  }
  next();
});

// Deobfuscate private key when retrieving (reverse back)
CryptoAddressSchema.post(['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete'], function(docs) {
  if (!docs) return;
  
  const processDoc = (doc) => {
    if (doc && doc.privateKey && typeof doc.privateKey === 'string') {
      doc.privateKey = deobfuscatePrivateKey(doc.privateKey);
    }
  };
  
  if (Array.isArray(docs)) {
    docs.forEach(processDoc);
  } else if (docs) {
    processDoc(docs);
  }
});

// Add virtual method to get deobfuscated private key
CryptoAddressSchema.methods.getPrivateKey = function() {
  return this.privateKey ? deobfuscatePrivateKey(this.privateKey) : null;
};

const CryptoAddress = mongoose.model('CryptoAddress', CryptoAddressSchema);

export default CryptoAddress;
