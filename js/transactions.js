// Refactored Transactions page script
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
  const transactionsList = document.getElementById('transactions-list');
  const filterSelect = document.getElementById('filter-transactions');
  const noTransactionsMessage = document.getElementById('no-transactions-message');
  
  // Fetch transactions
  async function fetchTransactions(filter = 'all') {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/transactions?filter=${filter}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      return data.transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showMessage('Error loading transactions. Please try again later.', 'error');
      return [];
    }
  }
  
  // Update transactions UI
  function updateTransactionsUI(transactions) {
    if (!transactionsList) return;
    
    // Clear existing transactions
    transactionsList.innerHTML = '';
    
    // Show/hide no transactions message
    if (transactions.length === 0) {
      if (noTransactionsMessage) {
        noTransactionsMessage.style.display = 'block';
      }
      return;
    } else if (noTransactionsMessage) {
      noTransactionsMessage.style.display = 'none';
    }
    
    // Add each transaction to the list
    transactions.forEach(transaction => {
      const transactionItem = document.createElement('li');
      transactionItem.className = `transaction-item ${transaction.type.toLowerCase()}`;
      
      // Format date
      const date = new Date(transaction.date);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      
      // Determine transaction icon and sign
      let icon = '';
      let sign = '';
      
      switch (transaction.type) {
        case 'DEPOSIT':
          icon = 'arrow_downward';
          sign = '+';
          break;
        case 'WITHDRAWAL':
          icon = 'arrow_upward';
          sign = '-';
          break;
        case 'EXCHANGE':
          icon = 'swap_horiz';
          sign = transaction.isReceiving ? '+' : '-';
          break;
        case 'BOT_PURCHASE':
          icon = 'shopping_cart';
          sign = '-';
          break;
        case 'BOT_REWARD':
          icon = 'paid';
          sign = '+';
          break;
        case 'REFERRAL_BONUS':
          icon = 'people';
          sign = '+';
          break;
        case 'DAILY_SIGNIN':
          icon = 'calendar_today';
          sign = '+';
          break;
        default:
          icon = 'receipt_long';
          sign = transaction.amount >= 0 ? '+' : '';
      }
      
      transactionItem.innerHTML = `
        <div class="transaction-icon">
          <span class="material-icons">${icon}</span>
        </div>
        <div class="transaction-details">
          <div class="transaction-title">${transaction.description}</div>
          <div class="transaction-date">${formattedDate} at ${formattedTime}</div>
        </div>
        <div class="transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
          ${sign}${Math.abs(transaction.amount).toFixed(2)} ${transaction.currency}
        </div>
      `;
      
      transactionsList.appendChild(transactionItem);
    });
  }
  
  // Handle filter change
  async function handleFilterChange() {
    const filter = filterSelect.value;
    const transactions = await fetchTransactions(filter);
    updateTransactionsUI(transactions);
  }
  
  // Add event listeners
  if (filterSelect) {
    filterSelect.addEventListener('change', handleFilterChange);
  }
  
  // Initialize
  async function initialize() {
    // Fetch initial transactions
    const transactions = await fetchTransactions('all');
    
    // Update transactions UI
    updateTransactionsUI(transactions);
    
    // Update user data and balance display
    await updateGlobalBalanceDisplay();
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
