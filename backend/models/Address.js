// This file is deprecated and has been consolidated into CryptoAddress.js
// Keeping this file as a reference for backward compatibility during migration
// All new code should use the consolidated CryptoAddress model

import mongoose from 'mongoose';
import CryptoAddress from './CryptoAddress.js';

// For backward compatibility, re-export the consolidated model
const Address = CryptoAddress;

// Warning message for developers
console.warn('Address.js is deprecated. Please use CryptoAddress.js for all cryptocurrency address operations.');

export default Address;
