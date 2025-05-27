import AddressService from '../services/AddressService.js';

// AddressService implementation
const assignAddressesToUser = async (userId) => {
  try {
    // Get available crypto addresses
    const addresses = await getAvailableCryptoAddresses();
    
    // Find the user
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Assign addresses to user
    if (addresses.bitcoin) {
      user.walletAddresses.bitcoin = addresses.bitcoin.address;
      await markAddressAsAssigned('bitcoin', addresses.bitcoin.address);
    }
    
    if (addresses.ethereum) {
      user.walletAddresses.ethereum = addresses.ethereum.address;
      await markAddressAsAssigned('ethereum', addresses.ethereum.address);
    }
    
    if (addresses.ubt) {
      user.walletAddresses.ubt = addresses.ubt.address;
    }
    
    // Save the updated user
    await user.save();
    
    return user.walletAddresses;
  } catch (error) {
    console.error('Error assigning addresses to user:', error);
    throw error;
  }
};

export default {
  assignAddressesToUser
};
