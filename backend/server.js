import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import directSmsVerification from './routes/direct-sms-verification.js';
import dailySignInRoutes from './routes/dailySignInRoutes.js'; // Added daily sign-in routes

// Load environment variables
dotenv.config();

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
const corsOptions = {
  origin: "*", // Allow all origins for debugging - consider restricting in production
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept, x-auth-token"
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/verify', directSmsVerification);
app.use('/api/daily-signin', dailySignInRoutes); // Use daily sign-in routes

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
    return res.status(404).json({ message: 'API endpoint not found.' });
  }
  // Otherwise, attempt to send index.html or another appropriate file
  // For now, let's be more specific for known HTML files or let express.static handle it.
  // If a file like /dashboard.html is requested, express.static(projectRoot) should serve it.
  // If not found by express.static, it will eventually 404.
  // We can add a specific fallback to root index.html if needed:
  // res.sendFile(path.resolve(projectRoot, 'index.html'));
  // However, for now, let express.static handle it and it will 404 if file not found.
});

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

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  });
});

