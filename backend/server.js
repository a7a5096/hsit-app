import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';

// --- Import models and middleware needed for the explicitly defined daily sign-in routes ---
import User from './models/User.js';
import Transaction from './models/Transaction.js';
import DailySignIn from './models/DailySignIn.js';
import authMiddleware from './middleware/auth.js';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Import other routes
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import teamRoutes from './routes/team.js';
import botsRoutes from './routes/bots.js';
import ubtRoutes from './routes/ubt.js';
import exchangeRatesRoutes from './routes/exchangeRates.js';
import depositRoutes from './routes/deposit.js';
import wheelRoutes from './routes/wheel.js';
import botCompletionRoutes from './routes/botCompletion.js';


// Initialize Express app
const app = express();

// --- Middleware ---
app.use(corsMiddleware()); // Handles CORS
app.use(express.json());   // Body parser for JSON requests

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/ubt', ubtRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/bot-completion', botCompletionRoutes);

// --- Explicitly Define Daily Sign-In Routes ---
app.get('/api/daily-signin/status', authMiddleware, async (req, res) => {
    console.log("Explicit GET /api/daily-signin/status route hit in server.js");
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const existingSignIn = await DailySignIn.findOne({ 
            userId, 
            date: { $gte: today, $lt: tomorrow }
        });

        res.json({ success: true, hasSignedInToday: !!existingSignIn });
    } catch (error) {
        console.error('Error checking daily sign-in status (explicit route):', error);
        res.status(500).json({ success: false, message: 'Server error checking sign-in status.' });
    }
});

app.post('/api/daily-signin/signin', authMiddleware, async (req, res) => {
    console.log("Explicit POST /api/daily-signin/signin route hit in server.js");
    try {
        const userId = req.user.id;
        const minReward = 0.10;
        const maxReward = 1.25;
        const calculatedReward = parseFloat((Math.random() * (maxReward - minReward) + minReward).toFixed(2));
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        if (await DailySignIn.findOne({ userId, date: { $gte: today, $lt: tomorrow } })) {
            return res.status(400).json({ success: false, message: 'You have already signed in today.' });
        }

        await new DailySignIn({ userId, date: today, reward: calculatedReward }).save();

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        let currentUbtBalance = 0;
        if (user.balances && user.balances.ubt) {
            currentUbtBalance = parseFloat(user.balances.ubt.toString());
        }
        
        const newTotalUbtBalance = currentUbtBalance + calculatedReward;
        user.balances.ubt = new mongoose.Types.Decimal128(newTotalUbtBalance.toFixed(2));
        
        await new Transaction({
            user: userId,
            userId: userId, // Explicitly added to satisfy validator for 'userId'
            type: 'reward',
            amount: calculatedReward,
            ubtAmount: calculatedReward, // Ensure this is also present
            currency: 'UBT',
            description: 'Daily Sign-in Bonus',
            status: 'completed',
            fromAddress: 'system', // Placeholder for required field
            txHash: `DAILY_SIGNIN_${userId}_${Date.now()}` // Unique identifier
        }).save();
        
        await user.save();

        res.json({
            success: true,
            message: `Successfully signed in! You received ${calculatedReward.toFixed(2)} UBT.`,
            newBalance: newTotalUbtBalance,
            reward: calculatedReward
        });

    } catch (error) {
        console.error('Error during explicit daily sign-in:', error);
        res.status(500).json({ success: false, message: 'Server error during sign-in process.' });
    }
});


// --- Basic Root Route ---
app.get('/', (req, res) => {
    res.send('HSIT App API is running...');
});

// --- Application Settings Initialization ---
async function initializeAppSettings() {
    // try {
    //     await Setting.getBonusCountdown(); // FIXME: Commenting out as Setting model is missing
    //     console.log("Global bonus countdown setting checked/initialized successfully.");
    // } catch (error) {
    //     console.error("Failed to initialize global bonus countdown setting:", error);
    // }
}

// --- Database Connection and Server Start ---
const startServer = async () => {
    try {
        await connectDB(); 
        await initializeAppSettings(); 

        const PORT = process.env.PORT || 10000; // Use 10000 based on your logs
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to connect to MongoDB or start server:', error);
        process.exit(1);
    }
};

startServer();
