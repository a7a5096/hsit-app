import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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
// Import crypto service
import CryptoAddressService from './services/CryptoAddressService.js';

// Load environment variables
dotenv.config();

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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

// CRYPTO ADDRESS MANAGEMENT ENDPOINTS
app.post('/admin/fix-addresses', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'hsit-fix-2025') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Starting address fix...');
    
    const importResult = await CryptoAddressService.importAddresses();
    console.log('Import result:', importResult);
    
    const fixResult = await CryptoAddressService.fixDuplicateAddresses();
    console.log('Fix result:', fixResult);
    
    const stats = await CryptoAddressService.getStats();
    
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

// Get address statistics (admin)
app.get('/admin/address-stats', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'hsit-fix-2025') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await CryptoAddressService.getStats();
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Assign addresses to specific user (admin)
app.post('/admin/assign-addresses/:userId', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== 'hsit-fix-2025') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const result = await CryptoAddressService.assignAddressesToUser(userId);
    
    res.json({
      success: true,
      message: 'Addresses assigned successfully',
      data: result
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
// This helps if you have client-side routing for some parts or just want a default page.
// Ensure index.html exists in your project root if you use this.
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
// Ensure database name is explicitly set to hsit_app
const dbURI = MONGO_URI.includes('/hsit_app?') ? MONGO_URI : MONGO_URI.replace('/?', '/hsit_app?');
const PORT = process.env.PORT || 5000;

console.log('Connecting to MongoDB with URI:', dbURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Log sanitized URI
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
