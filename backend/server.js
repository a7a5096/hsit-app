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
import dailySignInRoutes from './routes/dailySignIn.js'; // Updated path to match new file
import transactionsRoutes from './routes/transactions.js'; // Import transactions routes
import botsRoutes from './routes/bots.js'; // Import bots routes
import usersRoutes from './routes/users.js'; // Import users routes with SMS verification
import ubtRoutes from './routes/ubt.js'; // Import UBT routes for balance and spin

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
app.use('/api/daily-signin', dailySignInRoutes); // Use daily sign-in routes
app.use('/api/transactions', transactionsRoutes); // Use transactions routes
app.use('/api/bots', botsRoutes); // Use bots routes
app.use('/api/users', usersRoutes); // Use users routes with SMS verification
app.use('/api/ubt', ubtRoutes); // Use UBT routes for balance and spin

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
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
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
