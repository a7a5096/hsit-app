// backend/server.js

import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';
import Setting from './models/Setting.js';

// --- Import models and middleware needed for the explicitly defined daily sign-in routes ---
import User from './models/User.js';
import Transaction from './models/Transaction.js';
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


// backend/server.js
// ... (all other imports and setup code from the previous complete file) ...

// --- Explicitly Define Daily Sign-In Routes ---
const UBT_REWARD_DAILY_SIGN_IN = 10; // UBT reward for daily sign-in

// ... (the app.get('/api/daily-signin/status', ...) route remains the same) ...

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

        // --- FIX: Correctly create the Transaction document ---
        const transaction = new Transaction({
            userId: userId,
            // Type: Use 'reward' or ensure 'daily_signin_reward' is in your Transaction schema enum for 'type'
            type: 'reward', // CHANGED: Using 'reward' as a common valid type. Adjust if 'daily_signin_reward' is valid in your schema.
            amount: UBT_REWARD_DAILY_SIGN_IN,
            currency: 'UBT', // This should be 'UBT'
            description: 'Daily Sign-in Bonus',
            status: 'completed',
            txHash: `DAILY_SIGNIN_${userId}_${Date.now()}`, // Create a unique transaction hash
            fromAddress: 'SYSTEM_REWARD_POOL', // A system identifier for the source of funds
            toAddress: user.walletAddresses?.ubt || user.id.toString(), // User's UBT address or user ID as placeholder
            ubtAmount: UBT_REWARD_DAILY_SIGN_IN // Explicitly ubtAmount
            // Add any other fields required by your Transaction schema
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

// ... (rest of your server.js: Basic Root Route, initializeAppSettings, startServer, etc.) ...




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
        // Depending on severity, you might want to prevent server start if this is critical
    }
}

// --- Database Connection and Server Start ---
const startServer = async () => {
    try {
        await connectDB(); // Connect to DB first
        await initializeAppSettings(); // Then initialize app settings (like the bonus countdown)

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
