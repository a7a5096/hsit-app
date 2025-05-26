// This file is deprecated and has been consolidated into CryptoAddressService.js
// Keeping this file as a reference for backward compatibility during migration
// All new code should use the consolidated CryptoAddressService

import CryptoAddressService from './CryptoAddressService.js';

// For backward compatibility, re-export the consolidated service
const AddressService = CryptoAddressService;

// Warning message for developers
console.warn('AddressService.js is deprecated. Please use CryptoAddressService.js for all cryptocurrency address operations.');

export default AddressService;
