import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import directSmsVerification from './routes/direct-sms-verification.js';

// Load environment variables
dotenv.config();

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // Fixed variable name

const app = express();

// Middleware
// Configure CORS - TEMPORARILY ALLOW ALL ORIGINS FOR DEBUGGING
const corsOptions = {
  origin: "*", // Allow all origins for debugging
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept, x-auth-token"
};

// Apply CORS middleware BEFORE your API routes
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

// The directSmsVerification routes are already mounted at /api/auth
// which conflicts with authRoutes, so we need to be more specific
app.use('/api/auth/verify', directSmsVerification);

// Basic API test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// Serve static files from the frontend build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'));
  });
}

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://a7a5096:MM00nngg2@cluster0hsit.xelat83.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0HSIT';
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});

