import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
// Import custom CORS middleware
import corsMiddleware from './middleware/cors.js';
// Import routes
import authRoutes from './routes/auth.js';
import directSmsVerification from './routes/direct-sms-verification.js';
import dailySignInRoutes from './routes/dailySignInRoutes.js';
import transactionsRoutes from './routes/transactions.js';
import botsRoutes from './routes/bots.js';
import usersRoutes from './routes/users.js';
import teamRoutes from './routes/team.js';
import depositPageRoutes from './routes/depositPage.js';

// Load environment variables
dotenv.config();

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Define models directly in server.js
const CryptoAddress = mongoose.model('CryptoAddress', new mongoose.Schema({
  address: String,
  isAssigned: Boolean,
  type: String
}), 'cryptoaddresses');

const User = mongoose.model('User', new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  walletAddresses: {
    bitcoin: String,
    ethereum: String,
    ubt: String
  },
  balances: Object,
  createdAt: Date
}), 'users');

// Inline crypto address service
const cryptoAddressService = {
  async importAddressesFromData() {
    try {
      // Bitcoin addresses from your CSV
      const bitcoinAddresses = [
        '1as4MZTVW362uNHhpkrhHeHYws9AG8Mdm',
        '1M8qHQg7pMV9s5esnNLEAVAq7EjKkU6h22',
        '17cQfUMhGUgZHKoRgErHfv4LuvNWTv3ZTK',
        '187RRkxsn4hGC6QotDq3fRLxvbXD4153m5',
        '14VDgkSZFG7UgzyfoeY7uq3JQkkve5d6hc',
        '1MyaW8mXbreGsEgQ7JuNuKzd6DsypA2nAc',
        '1RR5MZeNWgX9SBXPCBfRDd8zWSecgteJg',
        '1BfQoXsD5mezcM6ujB1xwY4K8evb9ZUQMv',
        '1H86oRtHrR2YrXR8opvZUZf322MEsEBdm9',
        '1NrLcuWFg4LN5xRisMbe9ooWnngd3A9S6R'
        // Add more addresses as needed
      ];

      // Ethereum addresses from your CSV
      const ethereumAddresses = [
        '0xc48eA7e07164eCB2C9Ab882C0Ef4C02Df1FA269a',
        '0x0cBb0Fb2A44e1282710BA7ac4F7d566647379527',
        '0x8609CA11520Cb361B014947ed286C587D53b0D8b',
        '0xE4cD66E1e36265DC6beFB2b9D413D42871753226',
        '0x647a4623F2e01dEFc886fB5134E4262120f4f8A3',
        '0xC531B4dE170CC2ab84bDACcF75d7F36574f113Cd',
        '0x7B3E1EC995a2Ef00409cBE1B671DaC58f9E2849D',
        '0x40dAB5FBdc5C82Ddc27acfEA6aE786dd6726e814',
        '0xAbe5Fd383dc24D14E287C055Af0e85952117e605',
        '0x066C2A3a55AD6c676bA0BC3eBE6022fe318284c8'
        // Add more addresses as needed
      ];

      // USDT addresses (same as Ethereum for this example)
      const usdtAddresses = ethereumAddresses;

      // Import Bitcoin addresses
      for (const address of bitcoinAddresses) {
        await CryptoAddress.findOneAndUpdate(
          { address },
          { address, isAssigned: false, type: 'BTC' },
          { upsert: true }
        );
      }

      // Import Ethereum addresses
      for (const address of ethereumAddresses) {
        await CryptoAddress.findOneAndUpdate(
          { address },
          { address, isAssigned: false, type: 'ETH' },
          { upsert: true }
        );
      }

      // Import USDT addresses
      for (const address of usdtAddresses) {
        await CryptoAddress.findOneAndUpdate(
          { address },
          { address, isAssigned: false, type: 'USDT' },
          { upsert: true }
        );
      }

      console.log('Addresses imported successfully');
      return { BTC: bitcoinAddresses.length, ETH: ethereumAddresses.length, USDT: usdtAddresses.length };
    } catch (error) {
      console.error('Error importing addresses:', error);
      throw error;
    }
  },

  async fixDuplicateAddresses() {
    try {
      console.log('Starting duplicate address fix...');
      
      const users = await User.find({});
      console.log(`Found ${users.length} users to check`);

      let fixedCount = 0;
      
      for (const user of users) {
        let needsUpdate = false;
        const updates = {};

        const duplicateBTC = '1as4MZTVW362uNHhpkrhHeHYws9AG8Mdm';
        const duplicateETH = '0xc48eA7e07164eCB2C9Ab882C0Ef4C02Df1FA269a';

        // Fix Bitcoin address
        if (user.walletAddresses?.bitcoin === duplicateBTC) {
          const newBtcAddress = await CryptoAddress.findOneAndUpdate(
            { type: 'BTC', isAssigned: false },
            { isAssigned: true },
            { new: true }
          );
          
          if (newBtcAddress) {
            updates['walletAddresses.bitcoin'] = newBtcAddress.address;
            needsUpdate = true;
          }
        }

        // Fix Ethereum address
        if (user.walletAddresses?.ethereum === duplicateETH) {
          const newEthAddress = await CryptoAddress.findOneAndUpdate(
            { type: 'ETH', isAssigned: false },
            { isAssigned: true },
            { new: true }
          );
          
          if (newEthAddress) {
            updates['walletAddresses.ethereum'] = newEthAddress.address;
            needsUpdate = true;
          }
        }

        // Fix USDT address
        if (user.walletAddresses?.ubt === duplicateETH) {
          const newUsdtAddress = await CryptoAddress.findOneAndUpdate(
            { type: 'USDT', isAssigned: false },
            { isAssigned: true },
            { new: true }
          );
          
          if (newUsdtAddress) {
            updates['walletAddresses.ubt'] = newUsdtAddress.address;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await User.findByIdAndUpdate(user._id, updates);
          console.log(`Fixed addresses for user ${user.email}:`, updates);
          fixedCount++;
        }
      }

      console.log(`Fixed ${fixedCount} users with duplicate addresses`);
      return { fixedUsers: fixedCount };

    } catch (error) {
      console.error('Error fixing duplicate addresses:', error);
      throw error;
    }
  },

  async getAddressStats() {
    try {
      const stats = await CryptoAddress.aggregate([
        {
          $group: {
            _id: '$type',
            total: { $sum: 1 },
            assigned: { $sum: { $cond: ['$isAssigned', 1, 0] } },
            available: { $sum: { $cond: ['$isAssigned', 0, 1] } }
          }
        }
      ]);

      const result = {};
      stats.forEach(stat => {
        result[stat._id] = {
          total: stat.total,
          assigned: stat.assigned,
          available: stat.available
        };
      });

      return result;
    } catch (error) {
      console.error('Error getting address stats:', error);
      throw error;
    }
  }
};

// Apply enhanced CORS middleware
app.use(corsMiddleware());
app.options('*', corsMiddleware());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Global error handler middleware to ensure consistent JSON responses
app.use((err, req, res, next) => {
  console.error('Request error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/verify', directSmsVerification);
app.use('/api/daily-signin', dailySignInRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/team', teamRoutes);
app.use('/deposit', depositPageRoutes);

// CRYPTO ADDRESS FIX ENDPOINT
app.post('/admin/fix-addresses', async (req, res) => {
  try {
    // Add basic auth protection
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'hsit-fix-2025') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Starting address fix...');
    
    // Import addresses
    const importResult = await cryptoAddressService.importAddressesFromData();
    console.log('Import result:', importResult);
    
    // Fix duplicates
    const fixResult = await cryptoAddressService.fixDuplicateAddresses();
    console.log('Fix result:', fixResult);
    
    // Get final stats
    const stats = await cryptoAddressService.getAddressStats();
    
    res.json({
      success: true,
      message: 'Address fix completed',
      importResult,
      fixResult,
      stats
    });
    
  } catch (error) {
    console.error('Fix failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is healthy!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// Serve static files from the project root directory
const projectRoot = path.join(__dirname, '../');
app.use(express.static(projectRoot));

// Fallback to serving index.html from the project root for any unhandled GET requests
app.get('*', (req, res) => {
  // Check if the request is for an API route, if so, don't send index.html
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  
  // Otherwise, send index.html for client-side routing
  res.sendFile(path.resolve(projectRoot, 'index.html'));
});

// Error handling middleware - must be after all routes
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Server error', 
    error: process.env.NODE_ENV === 'production' ? null : err.message 
  });
});

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://a7a5096:MM00nngg2@cluster0hsit.xelat83.mongodb.net/hsit_app?retryWrites=true&w=majority&appName=Cluster0HSIT';
const dbURI = MONGO_URI.includes('/hsit_app?') ? MONGO_URI : MONGO_URI.replace('/?', '/hsit_app?');
const PORT = process.env.PORT || 5000;

console.log('Connecting to MongoDB with URI:', dbURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
mongoose.connect(dbURI)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});
