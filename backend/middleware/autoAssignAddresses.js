const AddressService = require('../services/AddressService');

// Middleware to automatically assign addresses to new users
const autoAssignAddresses = async (req, res, next) => {
  try {
    // This should run after user creation
    if (req.newUser && req.newUser._id) {
      // Assign addresses in background (don't wait)
      AddressService.assignAddressesToUser(req.newUser._id)
        .then(result => {
          console.log(`Auto-assigned addresses to user ${req.newUser._id}:`, result);
        })
        .catch(error => {
          console.error(`Failed to auto-assign addresses to user ${req.newUser._id}:`, error.message);
        });
    }
    
    next();
  } catch (error) {
    console.error('Error in autoAssignAddresses middleware:', error);
    // Don't break the request flow
    next();
  }
};

module.exports = autoAssignAddresses;
