import ExchangeRate from '../models/ExchangeRate.js';

// Function to get the UBT to USDT exchange rate
export const getUbtToUsdtRate = async () => {
  try {
    // Find the UBT to USDT exchange rate in the database
    const rate = await ExchangeRate.findOne({ fromCurrency: 'UBT', toCurrency: 'USDT' });

    if (rate) {
      // Return the rate from the database
      return rate.rate;
    } else {
      // If no rate is found in the database, you might want to fall back to a default
      // or handle the error appropriately. For now, we'll log an error.
      console.error('UBT-USDT exchange rate not found in the database.');
      // Returning 1 as a fallback to avoid breaking calculations, but you should
      // implement more robust error handling or a default rate management strategy.
      return 1;
    }
  } catch (error) {
    console.error('Error fetching UBT-USDT exchange rate:', error);
    // Handle the error as needed.
    // Returning 1 as a fallback.
    return 1;
  }
};
