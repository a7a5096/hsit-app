import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js'; // Assuming this is the original, correct import at the top
// ... other imports ...

const router = express.Router();

// ... existing routes ...


// @route   POST api/wheel/new-spin
// @desc    Process a spin from the new wheel game and update balance securely
// @access  Private
// router.post('/new-spin', auth, async (req, res) => { // Original line from my previous suggestion
// Ensure User model is imported (THIS LINE SHOULD BE REMOVED IF User IS ALREADY IMPORTED AT THE TOP)
// import User from '../models/User.js'; // <--- REMOVE THIS DUPLICATE IMPORT

router.post('/new-spin', auth, async (req, res) => { // Corrected line
    const { betAmount, winnings } = req.body;

    // --- Server-side validation ---
    if (typeof betAmount !== 'number' || typeof winnings !== 'number' || betAmount <= 0) {
        return res.status(400).json({ msg: 'Invalid bet or winnings amount provided.' });
    }

    try {
        const user = await User.findById(req.user.id); // This will now use the User model imported at the top

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Verify user has enough UBT for the bet
        if (user.balances.ubt < betAmount) {
            return res.status(400).json({ msg: 'Insufficient balance. Transaction rejected.' });
        }

        // Calculate the net change in balance
        const netChange = winnings - betAmount;

        // Apply the change to the user's balance
        user.balances.ubt += netChange;

        // Save the updated user data to the database
        await user.save();

        // Send back a success response with the new authoritative balance
        res.json({
            success: true,
            msg: `Spin processed. Net change: ${netChange.toFixed(2)} UBT.`,
            balances: user.balances
        });

    } catch (err) {
        console.error('New wheel spin server error:', err.message);
        res.status(500).send('Server Error');
    }
});

export default router;
