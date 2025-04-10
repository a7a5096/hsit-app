// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs'; // Or 'bcrypt' if you use that package
import User from '../models/User.js'; // Adjust path to your User model
import authMiddleware from '../middleware/authMiddleware.js'; // Assuming you have auth middleware

const router = express.Router();

// --- Other auth routes (login, register, etc.) would be here ---

// @route   POST /api/auth/change-password
// @desc    Change user's password
// @access  Private (requires user to be logged in)
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id; // Get user ID from the token payload via auth middleware

  // 1. Basic Input Validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ msg: 'Please provide both current and new passwords' });
  }

  // 2. New Password Complexity Check (Example: minimum length)
  if (newPassword.length < 8) { // Adjust complexity rules as needed
    return res.status(400).json({ msg: 'New password must be at least 8 characters long' });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ msg: 'New password cannot be the same as the current password' });
  }

  try {
    // 3. Fetch user from database
    // We refetch the user here to ensure we have the latest password hash
    // Alternatively, if authMiddleware already populates req.user fully, you might skip this.
    // However, refetching is safer if the password could have changed elsewhere.
    const user = await User.findById(userId).select('+password'); // Ensure password field is selected if needed

    if (!user) {
      // Should not happen if authMiddleware is correct, but good failsafe
      return res.status(404).json({ msg: 'User not found' });
    }

    // 4. Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      // Use a consistent error message for security (don't reveal WHICH password failed)
      return res.status(400).json({ msg: 'Unable to update password' });
      // Or more specific (less secure): return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    // 5. Hash new password
    const salt = await bcrypt.genSalt(10); // Use appropriate salt rounds
    user.password = await bcrypt.hash(newPassword, salt);

    // 6. Save updated user (handle potential DB errors)
    try {
      await user.save();
      res.json({ msg: 'Password updated successfully' });
    } catch (dbErr) {
      console.error('Database error saving updated password:', dbErr);
      res.status(500).json({ msg: 'Error saving updated password' });
    }

  } catch (err) {
    // 7. General Error Handling
    console.error('Error changing password:', err.message);
    // Avoid sending detailed internal errors to the client
    res.status(500).json({ msg: 'Server error during password update' });
  }
});


// --- Make sure to export the router ---
export default router;
