// Refactored UBT Exchange page script
// Uses centralized auth_utils.js for all user data and balance operations

import { requireAuth, fetchUserData, updateGlobalBalanceDisplay, initGlobalBalanceDisplay } from './auth_utils.js';

// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is logged in and redirect if not
  if (!requireAuth()) return;

  // Initialize global balance display
  await initGlobalBalanceDisplay();
  
  // Elements
  const exchangeForm = document.getElementById('exchange-form');
  const fromCurrencySelect = document.getElementById('from-currency');
  const toCurrencySelect = document.getElementById('to-currency');
  const amountInput = document.getElementById('exchange-amount');
  const estimatedOutput = document.getElementById('estimated-output');
  const exchangeRateDisplay = document.getElementById('exchange-rate');
  const balanceDisplay = document.getElementById('balance-display');
  const submitButton = document.getElementById('submit-exchange');
  
  // Exchange rates (in a real app, these would be fetched from an API)
  let exchangeRates = {
    buyRate: 0.01,  // Rate to buy UBT with USDT (1 USDT = 100 UBT)
    sellRate: 0.008 // Rate to sell UBT for USDT (1 UBT = 0.008 USDT)
  };
  
  // Fetch exchange rates from API
  async function fetchExchangeRates() {
    try {
      const response = await fetch(`${API_URL}/api/transactions/exchange-rates`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      exchangeRates = data;
      
      return data;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      showMessage('Error loading exchange rates. Using default values.', 'error');
      return exchangeRates;
    }
  }
  
  // Update balance display
  async function updateBalanceDisplay() {
    try {
      const userData = await fetchUserData();
      
      if (!userData || !userData.balances) {
        throw new Error('Failed to fetch user balances');
      }
      
      const balances = userData.balances;
      
      // Update balance display
      balanceDisplay.innerHTML = `
        <div class="balance-item">
          <span class="balance-label">USDT:</span>
          <span class="balance-value">${balances.usdt?.toFixed(2) || '0.00'}</span>
        </div>
        <div class="balance-item">
          <span class="balance-label">UBT:</span>
          <span class="balance-value">${balances.ubt?.toFixed(2) || '0.00'}</span>
        </div>
      `;
      
      // Also update global balance
      updateGlobalBalanceDisplay();
      
      return balances;
    } catch (error) {
      console.error('Error updating balance display:', error);
      balanceDisplay.innerHTML = `
        <div class="balance-item">
          <span class="balance-label">Error loading balances</span>
        </div>
      `;
      return null;
    }
  }
  
  // Calculate exchange output
  function calculateExchangeOutput(fromCurrency, toCurrency, amount) {
    if (fromCurrency === 'USDT' && toCurrency === 'UBT') {
      // Buying UBT with USDT
      return amount / exchangeRates.buyRate;
    } else if (fromCurrency === 'UBT' && toCurrency === 'USDT') {
      // Selling UBT for USDT
      return amount * exchangeRates.sellRate;
    } else {
      // Same currency, no exchange
      return amount;
    }
  }
  
  // Update exchange rate display
  function updateExchangeRateDisplay(fromCurrency, toCurrency) {
    if (fromCurrency === 'USDT' && toCurrency === 'UBT') {
      // Buying UBT with USDT
      exchangeRateDisplay.textContent = `1 USDT = ${(1 / exchangeRates.buyRate).toFixed(2)} UBT`;
    } else if (fromCurrency === 'UBT' && toCurrency === 'USDT') {
      // Selling UBT for USDT
      exchangeRateDisplay.textContent = `1 UBT = ${exchangeRates.sellRate.toFixed(4)} USDT`;
    } else {
      // Same currency, no exchange
      exchangeRateDisplay.textContent = '1:1';
    }
  }
  
  // Update estimated output
  function updateEstimatedOutput() {
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;
    const amount = parseFloat(amountInput.value) || 0;
    
    const output = calculateExchangeOutput(fromCurrency, toCurrency, amount);
    estimatedOutput.textContent = `${output.toFixed(2)} ${toCurrency}`;
    
    // Update exchange rate display
    updateExchangeRateDisplay(fromCurrency, toCurrency);
  }
  
  // Handle form submission
  async function handleExchangeSubmit(e) {
    e.preventDefault();
    
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;
    const amount = parseFloat(amountInput.value) || 0;
    
    if (amount <= 0) {
      showMessage('Please enter a valid amount', 'error');
      return;
    }
    
    if (fromCurrency === toCurrency) {
      showMessage('Cannot exchange to the same currency', 'error');
      return;
    }
    
    // Disable submit button
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';
    
    try {
      // Get user balances
      const userData = await fetchUserData();
      const balances = userData?.balances || {};
      
      // Check if user has enough balance
      const fromBalance = balances[fromCurrency.toLowerCase()] || 0;
      if (fromBalance < amount) {
        throw new Error(`Insufficient ${fromCurrency} balance`);
      }
      
      // Calculate output amount
      const outputAmount = calculateExchangeOutput(fromCurrency, toCurrency, amount);
      
      // Make exchange API call
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/transactions/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          fromCurrency,
          toCurrency,
          amount,
          expectedOutput: outputAmount
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || 'Exchange failed');
      }
      
      // Show success message
      showMessage(`Successfully exchanged ${amount} ${fromCurrency} to ${outputAmount.toFixed(2)} ${toCurrency}`, 'success');
      
      // Update balance display
      await updateBalanceDisplay();
      
      // Reset form
      amountInput.value = '';
      estimatedOutput.textContent = '0.00 ' + toCurrency;
      
    } catch (error) {
      console.error('Error processing exchange:', error);
      showMessage(error.message, 'error');
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = 'Exchange';
    }
  }
  
  // Add event listeners
  fromCurrencySelect.addEventListener('change', function() {
    // Update to currency options
    const fromCurrency = this.value;
    
    // Clear to currency options
    toCurrencySelect.innerHTML = '';
    
    // Add options based on from currency
    if (fromCurrency === 'USDT') {
      toCurrencySelect.innerHTML = '<option value="UBT">UBT</option>';
    } else if (fromCurrency === 'UBT') {
      toCurrencySelect.innerHTML = '<option value="USDT">USDT</option>';
    }
    
    // Update estimated output
    updateEstimatedOutput();
  });
  
  toCurrencySelect.addEventListener('change', updateEstimatedOutput);
  amountInput.addEventListener('input', updateEstimatedOutput);
  exchangeForm.addEventListener('submit', handleExchangeSubmit);
  
  // Initialize
  async function initialize() {
    // Fetch exchange rates
    await fetchExchangeRates();
    
    // Update balance display
    await updateBalanceDisplay();
    
    // Initialize estimated output
    updateEstimatedOutput();
  }
  
  initialize();
});

// Show message function
function showMessage(message, type = 'info') {
  // Check if status message element exists
  let statusElement = document.getElementById('statusMessage');
  
  // If not, create one
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'statusMessage';
    statusElement.className = 'status-message';
    document.body.prepend(statusElement);
  }
  
  // Set message and class
  statusElement.textContent = message;
  statusElement.className = `status-message ${type}`;
  
  // Show message
  statusElement.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 5000);
}
