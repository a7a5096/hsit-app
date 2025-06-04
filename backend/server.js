// backend/server.js

import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';
import Setting from './models/Setting.js';

// --- Import models and middleware needed for the explicit routes ---
import User from './models/User.js'; // Ensure path is correct
import Transaction from './models/Transaction.js'; // Ensure path is correct
import DailySignIn from './models/DailySignIn.js'; // Ensure path is correct
import authMiddleware from './middleware/auth.js'; // Ensure path is correct

// Load environment variables
dotenv.config();

// Import other routes (dailySignInRoutes remains commented out for this approach)
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import teamRoutes from './routes/team.js';
// import dailySignInRoutes from './routes/dailySignIn.js'; // <<<< REMAINS COMMENTED OUT
import botsRoutes from './routes/bots.js';
// ... other route imports

const app = express();

// --- Middleware ---
app.use(corsMiddleware());
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/team', teamRoutes);
// app.use('/api/daily-signin', dailySignInRoutes); // <<<< REMAINS COMMENTED OUT
app.use('/api/bots', botsRoutes);
// ... other app.use for routes

// --- Explicitly Define Daily Sign-In Routes ---
const UBT_REWARD_DAILY_SIGN_IN = 10; // Renamed for clarity if UBT_REWARD is used elsewhere

// @route   GET /api/daily-signin/status
// @desc    Check if user has signed in today (Explicitly defined in server.js)
// @access  Private
app.get('/api/daily-signin/status', authMiddleware, async (req, res) => {
    console.log("Explicit GET /api/daily-signin/status route hit in server.js"); // Debug log
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

        const newSignIn = new DailySignIn({ userId, date: today });
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

        const transaction = new Transaction({
            userId: userId,
            type: 'daily_signin_reward',
            amount: UBT_REWARD_DAILY_SIGN_IN,
            currency: 'UBT',
            description: 'Daily Sign-in Bonus',
            status: 'completed'
        });
        await transaction.save();
        await user.save();

        res.json({
            success: true,
            message: `Successfully signed in! You received ${UBT_REWARD_DAILY_SIGN_IN} UBT.`,
            newBalance: user.balances.ubt,
            reward: UBT_REWARD_DAILY_SIGN_IN
        });

    } catch (error) {
        console.error('Error during explicit daily sign-in:', error);
        res.status(500).json({ success: false, message: 'Server error during sign-in process.', error: error.message });
    }
});

// --- Basic Root Route ---
// app.get('/', (req, res) => { ... }); // Already exists

// --- Application Settings Initialization ---
// async function initializeAppSettings() { ... } // Already exists

// --- Database Connection and Server Start ---
// const startServer = async () => { ... }; // Already exists
// startServer(); // Already exists
