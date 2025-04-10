// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';


// Script to handle transaction history functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  // Elements
  const transactionsList = document.createElement('div');
  transactionsList.className = 'transactions-list';
  
  // Add to page
  const mainElement = document.querySelector('.page-main');
  if (mainElement) {
    // Create transactions section
    const transactionsSection = document.createElement('section');
    transactionsSection.className = 'content-section card-style';
    transactionsSection.innerHTML = '<h2>Transaction History</h2>';
    transactionsSection.appendChild(transactionsList);
    
    // Add to main
    mainElement.appendChild(transactionsSection);
  }
  
  // Fetch transactions
  async function fetchTransactions() {
    try {
      const response = await fetch('${API_BASE_URL}/api/transactions', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const transactions = await response.json();
      displayTransactions(transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showMessage('Error loading your transactions. Please try again later.', 'error');
    }
  }
  
  // Display transactions
  function displayTransactions(transactions) {
    if (!transactions || !transactions.length) {
      transactionsList.innerHTML = '<p class="info-text">No transactions found.</p>';
      return;
    }
    
    // Clear existing transactions
    transactionsList.innerHTML = '';
    
    // Create table
    const table = document.createElement('table');
    table.className = 'transactions-table';
    
    // Add header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Currency</th>
        <th>Amount</th>
        <th>Status</th>
      </tr>
    `;
    table.appendChild(thead);
    
    // Add body
    const tbody = document.createElement('tbody');
    
    // Sort transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Add each transaction
    transactions.forEach(transaction => {
      const tr = document.createElement('tr');
      
      // Format date
      const date = new Date(transaction.createdAt);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      
      // Format amount with sign
      let amountWithSign = transaction.amount;
      if (transaction.type === 'withdrawal' || 
          (transaction.type === 'exchange' && transaction.amount < 0)) {
        amountWithSign = transaction.amount; // Already negative
      } else if (transaction.type === 'deposit' || transaction.type === 'bonus') {
        amountWithSign = `+${transaction.amount}`;
      }
      
      // Set row class based on status
      tr.className = `transaction-${transaction.status}`;
      
      tr.innerHTML = `
        <td>${formattedDate}</td>
        <td>${capitalizeFirstLetter(transaction.type)}</td>
        <td>${transaction.currency}</td>
        <td class="${transaction.amount < 0 ? 'negative' : 'positive'}">${amountWithSign}</td>
        <td>${capitalizeFirstLetter(transaction.status)}</td>
      `;
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    transactionsList.appendChild(table);
  }
  
  // Helper function to capitalize first letter
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  // Initialize
  fetchTransactions();
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
