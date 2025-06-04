import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import corsMiddleware from './middleware/cors.js';
import Setting from './models/Setting.js';

// --- Import models and middleware needed for the explicit route ---
import User from './models/User.js'; // Assuming path is correct
import Transaction from './models/Transaction.js'; // Assuming path is correct
import DailySignIn from './models/DailySignIn.js'; // Assuming path is correct
import authMiddleware from './middleware/auth.js'; // Assuming path is correct

// Load environment variables
dotenv.config();

// Import other routes (dailySignInRoutes will be commented out)
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import teamRoutes from './routes/team.js';
// import dailySignInRoutes from './routes/dailySignIn.js'; // <<<< COMMENTED OUT
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
// app.use('/api/daily-signin', dailySignInRoutes); // <<<< COMMENTED OUT
app.use('/api/bots', botsRoutes);
app.use('/api/ubt', ubtRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/wheel', wheelRoutes);
app.use('/api/direct_crypto_asset', cryptoAssetRoutes);

// --- Explicitly Define Daily Sign-In Route ---
const UBT_REWARD = 10; // Define UBT reward amount, or import from a config

// @route   POST /api/daily-signin/signin
// @desc    Record daily sign-in and award UBT (Explicitly defined in server.js)
// @access  Private
app.post('/api/daily-signin/signin', authMiddleware, async (req, res) => {
    console.log("Explicit POST /api/daily-signin/signin route hit in server.js"); // Debug log
    try {
        const userId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today in server's timezone

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

        // Check if user already signed in today
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

        // Record the new sign-in
        const newSignIn = new DailySignIn({ userId, date: today });
        await newSignIn.save();

        // Award UBT
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!user.balances) {
            user.balances = { ubt: 0 };
        } else if (typeof user.balances.ubt !== 'number') {
            user.balances.ubt = 0;
        }
        user.balances.ubt += UBT_REWARD;

        const transaction = new Transaction({
            userId: userId,
            type: 'daily_signin_reward',
            amount: UBT_REWARD,
            currency: 'UBT',
            description: 'Daily Sign-in Bonus',
            status: 'completed'
        });
        await transaction.save();
        await user.save();

        res.json({
            success: true,
            message: `Successfully signed in! You received ${UBT_REWARD} UBT.`,
            newBalance: user.balances.ubt,
            reward: UBT_REWARD
        });

    } catch (error) {
        console.error('Error during explicit daily sign-in:', error);
        res.status(500).json({ success: false, message: 'Server error during sign-in process.', error: error.message });
    }
});

// You might also want to explicitly define the GET /api/daily-signin/status route here for completeness
// if you comment out the app.use('/api/daily-signin', dailySignInRoutes);
// For now, we are only testing the POST /signin route.

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
