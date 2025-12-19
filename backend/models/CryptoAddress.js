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
    enum: ['bitcoin', 'ethereum', 'ubt', 'usdt']
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
// Always obfuscate when saving - the post hook will deobfuscate when reading
CryptoAddressSchema.pre('save', function(next) {
  if (this.isModified('privateKey') && this.privateKey) {
    // When a document is read from DB, the post hook deobfuscates it in memory
    // When we save, we need to obfuscate it again for storage
    // For new documents, we obfuscate the plaintext key
    // The check: if this is a new document OR the key was explicitly modified, obfuscate it
    // Since post hook deobfuscates on read, any key in memory is deobfuscated
    // So we always obfuscate when saving (unless it's a palindrome, which is extremely rare)
    const reversed = deobfuscatePrivateKey(this.privateKey);
    
    // Only skip obfuscation if it's a palindrome (reversing doesn't change it)
    // This is extremely rare for private keys, but we handle it to avoid double-processing
    if (reversed !== this.privateKey) {
      // Not a palindrome, obfuscate it
      this.privateKey = obfuscatePrivateKey(this.privateKey);
    }
    // If it's a palindrome, leave it as is (extremely rare case)
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
