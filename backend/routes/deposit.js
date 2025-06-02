import express from 'express';
import authMiddleware from '../middleware/auth.js';
import addressAssignmentService from '../services/addressAssignmentService.js'; // Corrected import name
import User from '../models/User.js'; // Ensure User model is imported if needed by service

const router = express.Router();

/**
 * @route   GET /api/deposit/addresses
 * @desc    Get user's crypto addresses or assign if not already assigned
 * @access  Private
 */
router.get('/addresses', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // Ensure user exists (optional, addressAssignmentService might do this)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const addresses = await addressAssignmentService.getUserAddresses(userId);
    
    // Check if addresses were successfully retrieved or assigned
    if (!addresses || (!addresses.BTC && !addresses.ETH && !addresses.USDT)) {
        // This case might indicate that addresses couldn't be assigned (e.g., none available)
        // addressAssignmentService should ideally throw an error in such cases that we catch below
        return res.status(400).json({ 
            success: false, 
            message: 'Could not retrieve or assign deposit addresses. No addresses available or user not found.' 
        });
    }

    res.json({
      success: true,
      // Ensure consistent naming with frontend expectations if they differ from service's return
      btcAddress: addresses.BTC,
      ethAddress: addresses.ETH,
      usdtAddress: addresses.USDT 
    });

  } catch (error) {
    console.error(`Error in GET /api/deposit/addresses: ${error.message}`, error.stack);
    // Ensure a JSON response is sent for any caught error
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error while retrieving deposit addresses.'
    });
  }
});

export default router;
