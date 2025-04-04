const crypto = require('crypto');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

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
 * Load crypto addresses from CSV files
 * @returns {Object} - Object containing BTC and ETH addresses
 */
const loadCryptoAddresses = () => {
  try {
    const btcAddressesPath = path.join(__dirname, '../../bitcoin.csv');
    const ethAddressesPath = path.join(__dirname, '../../ethereum.csv');
    const usdtAddressesPath = path.join(__dirname, '../../USDT.csv');
    
    const btcAddresses = fs.readFileSync(btcAddressesPath, 'utf8').split('\n').filter(Boolean);
    const ethAddresses = fs.readFileSync(ethAddressesPath, 'utf8').split('\n').filter(Boolean);
    const usdtAddresses = fs.readFileSync(usdtAddressesPath, 'utf8').split('\n').filter(Boolean);
    
    return {
      success: true,
      btcAddresses,
      ethAddresses,
      usdtAddresses
    };
  } catch (error) {
    console.error('Error loading crypto addresses:', error);
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

module.exports = {
  generateVerificationCode,
  generateInvitationCode,
  generateQRCode,
  loadCryptoAddresses,
  calculateUBTExchangeRate,
  calculateUBTBuyRate
};
