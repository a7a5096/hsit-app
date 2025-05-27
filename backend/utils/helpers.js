import crypto from 'crypto';
import qrcode from 'qrcode';
import mongoose from 'mongoose';

/**
 * Generate a random verification code
 * @param {number} length - Length of the verification code
 * @returns {string} - Generated verification code
 */
const generateVerificationCode = (length = 6) => {
  return Math.floor(100000 + Math.random() * 900000).toString().substring(0, length);
};

/**
 * Generate a random invitation code
 * @param {number} length - Length of the invitation code
 * @returns {string} - Generated invitation code
 */
const generateInvitationCode = (length = 8) => {
  return crypto.randomBytes(length).toString('hex').toUpperCase().substring(0, length);
};

/**
 * Generate QR code for a crypto address
 * @param {string} address - Crypto address
 * @param {string} outputPath - Path to save the QR code image
 * @returns {Promise} - QR code generation result
 */
const generateQRCode = async (address, outputPath) => {
  try {
    await qrcode.toFile(outputPath, address, {
      color: {
        dark: '#ffffff',
        light: '#1f1f30'
      }
    });
    return {
      success: true,
      path: outputPath
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Load crypto addresses from database
 * @returns {Promise<Object>} - Object containing BTC, ETH, and USDT addresses
 */
const loadCryptoAddresses = async () => {
  try {
    const CryptoAddress = mongoose.model('CryptoAddress');
    
    const btcAddresses = await CryptoAddress.find({
      currency: 'BTC',
      isAssigned: false,
      isActive: true
    }).select('address').sort({ createdAt: 1 });
    
    const ethAddresses = await CryptoAddress.find({
      currency: 'ETH',
      isAssigned: false,
      isActive: true
    }).select('address').sort({ createdAt: 1 });
    
    const usdtAddresses = await CryptoAddress.find({
      currency: 'USDT',
      isAssigned: false,
      isActive: true
    }).select('address').sort({ createdAt: 1 });
    
    return {
      success: true,
      btcAddresses: btcAddresses.map(addr => addr.address),
      ethAddresses: ethAddresses.map(addr => addr.address),
      usdtAddresses: usdtAddresses.map(addr => addr.address)
    };
  } catch (error) {
    console.error('Error loading crypto addresses from database:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Calculate UBT exchange rate
 * @param {number} withdrawalCount - Number of withdrawals made
 * @param {number} initialRate - Initial exchange rate
 * @param {number} increaseRate - Rate of increase per withdrawal
 * @returns {number} - Current exchange rate
 */
const calculateUBTExchangeRate = (withdrawalCount, initialRate = 1.0, increaseRate = 0.04) => {
  return initialRate * (1 + increaseRate * withdrawalCount);
};

/**
 * Calculate UBT buy rate
 * @param {number} currentExchangeRate - Current UBT exchange rate
 * @param {number} buyRateFactor - Buy rate factor (percentage of exchange rate)
 * @returns {number} - Current buy rate
 */
const calculateUBTBuyRate = (currentExchangeRate, buyRateFactor = 0.98) => {
  return currentExchangeRate * buyRateFactor;
};

export {
  generateVerificationCode,
  generateInvitationCode,
  generateQRCode,
  loadCryptoAddresses,
  calculateUBTExchangeRate,
  calculateUBTBuyRate
};
