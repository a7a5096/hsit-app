const express = require('express');
const router = express.Router();
const AddressService = require('../services/AddressService');
const auth = require('../middleware/auth'); // Adjust as needed

// Import addresses from CSV files
router.post('/import', auth, async (req, res) => {
  try {
    const results = await AddressService.importAddressesFromCSV();
    res.json({
      success: true,
      message: 'Addresses imported successfully',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to import addresses',
      error: error.message
    });
  }
});

// Get address statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await AddressService.getAddressStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get address statistics',
      error: error.message
    });
  }
});

// Assign addresses to current user
router.post('/assign', auth, async (req, res) => {
  try {
    const { currencies } = req.body;
    const userId = req.user.id; // Adjust based on your auth middleware
    
    const result = await AddressService.assignAddressesToUser(userId, currencies);
    res.json({
      success: true,
      message: 'Addresses assigned successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign addresses',
      error: error.message
    });
  }
});

// Get current user's addresses
router.get('/my-addresses', auth, async (req, res) => {
  try {
    const userId = req.user.id; // Adjust based on your auth middleware
    const addresses = await AddressService.getUserAddresses(userId);
    
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user addresses',
      error: error.message
    });
  }
});

// Admin: Get any user's addresses
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Add admin check here if needed
    const { userId } = req.params;
    const addresses = await AddressService.getUserAddresses(userId);
    
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user addresses',
      error: error.message
    });
  }
});

// Admin: Bulk assign to all existing users
router.post('/bulk-assign', auth, async (req, res) => {
  try {
    // Add admin check here if needed
    const results = await AddressService.bulkAssignToExistingUsers();
    res.json({
      success: true,
      message: 'Bulk assignment completed',
      data: {
        processedUsers: results.length,
        results: results
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk assign addresses',
      error: error.message
    });
  }
});

// Release user addresses
router.post('/release', auth, async (req, res) => {
  try {
    const { currencies } = req.body;
    const userId = req.user.id; // Adjust based on your auth middleware
    
    const result = await AddressService.releaseUserAddresses(userId, currencies);
    res.json({
      success: true,
      message: 'Addresses released successfully',
      data: { released: result }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to release addresses',
      error: error.message
    });
  }
});

module.exports = router;
