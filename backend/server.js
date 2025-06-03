import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js'; // Import the cors middleware

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import teamRoutes from './routes/team.js';
import dailySignInRoutes from './routes/dailySignIn.js';
import botsRoutes from './routes/bots.js';
import ubtRoutes from './routes/ubt.js';
import exchangeRatesRoutes from './routes/exchangeRates.js';
import depositRoutes from './routes/deposit.js';
import wheelRoutes from './routes/wheel.js';
import cryptoAssetRoutes from './routes/cryptoAsset.js';
import bannerAssetRoutes from './routes/bannerAssets.js';

// Initialize Express app
const app = express();

// --- Middleware ---
// 1. CORS Middleware - Use the configured middleware
app.use(corsMiddleware());

// 2. Body Parser Middleware - THIS IS THE CRITICAL FIX
// This line MUST come BEFORE you define your routes. It allows the server
// to read the JSON data sent from the signup form.
app.use(express.json());

// --- API Routes ---
// All your API routes are defined AFTER the middleware.
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/daily-signin', dailySignInRoutes); // Changed from daily-sign-in to daily-signin to match frontend
app.use('/api/bots', botsRoutes);
app.use('/api/ubt', ubtRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/direct_crypto_asset', cryptoAssetRoutes);
app.use('/api/banner-assets', bannerAssetRoutes);

// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('HSIT App API is running...');
});

// --- Database Connection and Server Start ---
const startServer = async () => {
    try {
        await connectDB();
        const PORT = process.env.PORT || 5001; // Render will provide the PORT env variable
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB or start server:', error);
        process.exit(1);
    }
};

startServer();
