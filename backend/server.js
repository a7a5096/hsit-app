// backend/server.js

import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';        // Ensure this path is correct
import corsMiddleware from './middleware/cors.js'; // Ensure this path is correct
import Setting from './models/Setting.js';       // Ensure this path is correct

// --- Import models and middleware needed for the explicitly defined daily sign-in routes ---
import User from './models/User.js';             // Ensure this path is correct
import Transaction from './models/Transaction.js'; // Ensure this path is correct
import DailySignIn from './models/DailySignIn.js'; // Ensure this path is correct
import authMiddleware from './middleware/auth.js'; // Ensure this path is correct

// Import mongoose here, as it's needed for Decimal128 operations
import mongoose from 'mongoose'; // ADD THIS LINE

// Load environment variables
dotenv.config();

// Import other routes
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import teamRoutes from './routes/team.js';
// import dailySignInRoutes from './routes/dailySignIn.js'; // Using explicit routes below
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
// app.use('/api/daily-signin', dailySignInRoutes); // Using explicit routes below
app.use('/api/bots', botsRoutes);
app.use('/api/ubt', ubtRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/direct_crypto_asset', cryptoAssetRoutes);

// --- Explicitly Define Daily Sign-In Routes ---
// const UBT_REWARD_DAILY_SIGN_IN = 10; // This fixed constant is no longer used directly for reward amount

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

        // --- MODIFICATION: Calculate random reward ---
        const minReward = 0.10;
        const maxReward = 1.25;
        const calculatedReward = parseFloat((Math.random() * (maxReward - minReward) + minReward).toFixed(2));
        console.log(`Daily sign-in: User ${userId} awarded ${calculatedReward} UBT`);
        // --- END MODIFICATION ---

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
            reward: calculatedReward // Use the calculated random reward
        });
        await newSignIn.save();

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // --- START MODIFICATION for Decimal128 handling in balance update ---
        let currentUbtBalance = 0;
        if (user.balances && user.balances.ubt) {
            // Check if it's a Decimal128 object and convert to number
            if (typeof user.balances.ubt.toString === 'function') { // A simple check for Mongoose Decimal128 object
                currentUbtBalance = parseFloat(user.balances.ubt.toString());
            } else if (typeof user.balances.ubt === 'number') { // If it was already a number (e.g., from old data)
                currentUbtBalance = user.balances.ubt;
            }
        }
        
        // Calculate the new total balance
        const newTotalUbtBalance = currentUbtBalance + calculatedReward;

        // Update the user's UBT balance, converting back to Decimal128 for storage
        user.balances.ubt = new mongoose.Types.Decimal128(newTotalUbtBalance.toFixed(2));
        // --- END MODIFICATION ---

        const transaction = new Transaction({
            userId: userId,
            type: 'reward', // Ensure this type is valid in your Transaction model enum
            amount: calculatedReward, // Use the calculated random reward
            currency: 'UBT',
            description: 'Daily Sign-in Bonus',
            status: 'completed',
            txHash: `SIGNIN_${userId}_${Date.now()}`, 
            fromAddress: 'SYSTEM_DAILY_REWARD',     
            toAddress: user.walletAddresses?.ubt || user.id.toString(), 
            ubtAmount: calculatedReward // Use the calculated random reward
        });
        await transaction.save();
        
        await user.save();

        res.json({
            success: true,
            message: `Successfully signed in! You received ${calculatedReward.toFixed(2)} UBT.`,
            newBalance: newTotalUbtBalance, // Send the calculated number, not the Decimal128 object directly
            reward: calculatedReward // Send the actual reward given
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
