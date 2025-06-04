import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js'; // Import the cors middleware
import Setting from './models/Setting.js';      // SINGLE import of Setting model

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

// Initialize Express app
const app = express();

// --- Middleware ---
app.use(corsMiddleware());
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/daily-signin', dailySignInRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/ubt', ubtRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/direct_crypto_asset', cryptoAssetRoutes);

// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('HSIT App API is running...');
});

// --- Application Settings Initialization ---
async function initializeAppSettings() {
    try {
        // This ensures the setting is created if it doesn't exist, using the static method from your Setting model
        await Setting.getBonusCountdown(); 
        console.log("Global bonus countdown setting checked/initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize global bonus countdown setting:", error);
        // Depending on severity, you might want to prevent server start, but for now, we log and continue.
    }
}

// --- Database Connection and Server Start ---
const startServer = async () => {
    try {
        await connectDB(); // Connect to DB first
        await initializeAppSettings(); // Then initialize app settings like the bonus countdown

        const PORT = process.env.PORT || 5001;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB or start server:', error);
        process.exit(1);
    }
};

// REMOVE THE DUPLICATE IMPORT FROM HERE (it was previously around this area)
// Setting.getBonusCountdown(); // This call is now inside initializeAppSettings

startServer();
