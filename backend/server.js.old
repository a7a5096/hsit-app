// backend/server.js

import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';
import Setting from './models/Setting.js';

// --- Import models and middleware needed for the explicitly defined daily sign-in routes ---
import User from './models/User.js';
import Transaction from './models/Transaction.js'; // Make sure this model is correctly defined
import DailySignIn from './models/DailySignIn.js';
import authMiddleware from './middleware/auth.js';

// Load environment variables
dotenv.config();

// Import other routes (dailySignInRoutes from a separate file remains commented out)
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import teamRoutes from './routes/team.js';
// import dailySignInRoutes from './routes/dailySignIn.js'; // <<<< Using explicit routes below
import botsRoutes from './routes/bots.js';
import ubtRoutes from './routes/ubt.js';
import exchangeRatesRoutes from './routes/exchangeRates.js';
import depositRoutes from './routes/deposit.js';
import wheelRoutes from './routes/wheel.js';
import cryptoAssetRoutes from './routes/cryptoAsset.js';

// Initialize Express app
const app = express();

// --- Middleware ---
app.use(corsMiddleware()); // Handles CORS
app.use(express.json());   // Body parser for JSON requests

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/team', teamRoutes);
// app.use('/api/daily-signin', dailySignInRoutes); // <<<< Using explicit routes below
app.use('/api/bots', botsRoutes);
app.use('/api/ubt', ubtRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/direct_crypto_asset', cryptoAssetRoutes);

// --- Explicitly Define Daily Sign-In Routes ---
const UBT_REWARD_DAILY_SIGN_IN = 10; // UBT reward for daily sign-in

// @route   GET /api/daily-signin/status
// @desc    Check if user has signed in today (Explicitly defined in server.js)
// @access  Private
app.get('/api/daily-signin/status', authMiddleware, async (req, res) => {
    console.log("Explicit GET /api/daily-signin/status route hit in server.js");
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today in server's timezone

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

        const existingSignIn = await DailySignIn.findOne({ 
            userId, 
            date: {
                $gte: today,
                $lt: tomorrow
            }
        });

        res.json({ success: true, hasSignedInToday: !!existingSignIn });
    } catch (error) {
        console.error('Error checking daily sign-in status (explicit route):', error);
        res.status(500).json({ success: false, message: 'Server error checking sign-in status.' });
    }
});

// @route   POST /api/daily-signin/signin
// @desc    Record daily sign-in and award UBT (Explicitly defined in server.js)
// @access  Private
app.post('/api/daily-signin/signin', authMiddleware, async (req, res) => {
    console.log("Explicit POST /api/daily-signin/signin route hit in server.js");
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const existingSignIn = await DailySignIn.findOne({ 
            userId, 
            date: {
                $gte: today,
                $lt: tomorrow
            }
        });

        if (existingSignIn) {
            return res.status(400).json({ success: false, message: 'You have already signed in today.' });
        }

        const newSignIn = new DailySignIn({ 
            userId, 
            date: today,
            reward: UBT_REWARD_DAILY_SIGN_IN 
        });
        await newSignIn.save();

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!user.balances) {
            user.balances = { ubt: 0 };
        } else if (typeof user.balances.ubt !== 'number') {
            user.balances.ubt = 0;
        }
        user.balances.ubt += UBT_REWARD_DAILY_SIGN_IN;

        // --- FIX: Create the Transaction document with all required fields ---
        const transaction = new Transaction({
            userId: userId,
            // Type: Change 'daily_signin_reward' to a type that IS VALID in your Transaction schema's enum.
            // For example, if your enum includes 'reward' or 'bonus', use that.
            // If you want to use 'daily_signin_reward', you MUST add it to the enum in backend/models/Transaction.js
            type: 'reward', // <<< ACTION: Verify or change this type based on your Transaction model
            amount: UBT_REWARD_DAILY_SIGN_IN,
            currency: 'UBT',
            description: 'Daily Sign-in Bonus',
            status: 'completed',
            txHash: `SIGNIN_${userId}_${Date.now()}`, // Generating a unique txHash
            fromAddress: 'SYSTEM_DAILY_REWARD',     // Placeholder for system-originated funds
            toAddress: user.walletAddresses?.ubt || user.id.toString(), // User's UBT address or ID as placeholder
            ubtAmount: UBT_REWARD_DAILY_SIGN_IN      // Explicitly providing ubtAmount
            // Add any other fields that are required by your Transaction.js schema
        });
        await transaction.save();
        // --- END FIX ---
        
        await user.save();

        res.json({
            success: true,
            message: `Successfully signed in! You received ${UBT_REWARD_DAILY_SIGN_IN} UBT.`,
            newBalance: user.balances.ubt,
            reward: UBT_REWARD_DAILY_SIGN_IN
        });

    } catch (error) {
        console.error('Error during explicit daily sign-in:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: 'Validation failed.', error: error.message });
        }
        res.status(500).json({ success: false, message: 'Server error during sign-in process.', error: error.message });
    }
});

// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('HSIT App API is running...');
});

// --- Application Settings Initialization ---
async function initializeAppSettings() {
    try {
        await Setting.getBonusCountdown(); 
        console.log("Global bonus countdown setting checked/initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize global bonus countdown setting:", error);
    }
}

// --- Database Connection and Server Start ---
const startServer = async () => {
    try {
        await connectDB(); 
        await initializeAppSettings(); 

        const PORT = process.env.PORT || 5001; 
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB or start server:', error);
        process.exit(1);
    }
};

startServer();
