// Refactored Asset Center page script
// Uses centralized auth_utils.js for all user data and balance operations

import { requireAuth, fetchUserData, updateGlobalBalanceDisplay, initGlobalBalanceDisplay, getAuthToken } from './auth_utils.js';

// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';

// Script to handle asset center functionality
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is logged in and redirect if not
  if (!requireAuth()) return;

  // Initialize global balance display
  await initGlobalBalanceDisplay();
  
  // Elements
  const totalValueElement = document.querySelector('.total-value');
  const balancesList = document.querySelector('.balances-list');
  const depositBtn = document.querySelector('a.btn-primary');
  const withdrawBtn = document.querySelector('a.btn-secondary');
  const purchasedBotsContainer = document.querySelector('.purchased-bots-container');
  const emptyBotsMessage = document.querySelector('.empty-bots-message');
  
  // Update deposit and withdraw buttons
  if (depositBtn) {
    depositBtn.href = 'deposit.html';
  }
  
  if (withdrawBtn) {
    withdrawBtn.href = '#'; // Will be handled by modal
    withdrawBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showWithdrawalModal();
    });
  }
  
  // Fetch user balances, transactions, and purchased bots
  async function fetchAssetData() {
    try {
      // Fetch user data from centralized utility
      const userData = await fetchUserData();
      if (!userData) {
        throw new Error('Failed to fetch user data');
      }
      
      // Fetch exchange rates
      const ratesResponse = await fetch(`${API_URL}/api/transactions/exchange-rates`);
      const rates = await ratesResponse.json();
      
      // Update UI with user balances
      updateBalances(userData.balances, rates);
      
      // Fetch purchased bots
      const token = getAuthToken();
      const botsResponse = await fetch(`${API_URL}/api/bots/purchased`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!botsResponse.ok) {
        throw new Error('Failed to fetch purchased bots');
      }
      
      const botsData = await botsResponse.json();
      
      // Update UI with purchased bots
      updatePurchasedBots(botsData.bots);
      
      return userData;
    } catch (error) {
      console.error('Error fetching asset data:', error);
      showMessage('Error loading your account data. Please try again later.', 'error');
      
      // For demo purposes, create mock data if API fails
      createMockBotData();
      
      return null;
    }
  }
  
  // Update balances UI
  function updateBalances(balances, rates) {
    if (!balances || !balancesList) return;
    
    // Clear existing balances
    balancesList.innerHTML = '';
    
    // Calculate total value in USD
    let totalValue = 0;
    
    // Fetch current crypto prices (in a real app, this would come from an API)
    const cryptoPrices = {
      btc: 70000, // Example price in USD
      eth: 3500,  // Example price in USD
      usdt: 1,    // USDT is pegged to USD
      ubt: rates.sellRate // UBT price from exchange rate
    };
    
    // Add each balance to the list
    const currencies = [
      { key: 'usdt', name: 'USDT', fullName: 'Tether', icon: 'icon_usdt.svg' },
      { key: 'ubt', name: 'UBT', fullName: 'Un-Buyable Token', icon: 'icon_usdt.svg', special: true },
      { key: 'btc', name: 'BTC', fullName: 'Bitcoin', icon: 'icon_btc.svg' },
      { key: 'eth', name: 'ETH', fullName: 'Ethereum', icon: 'icon_eth.svg' }
    ];
    
    currencies.forEach(currency => {
      const balance = balances[currency.key] || 0;
      const usdValue = balance * cryptoPrices[currency.key];
      totalValue += usdValue;
      
      const balanceItem = document.createElement('li');
      balanceItem.className = `balance-item${currency.special ? ' ubt-balance' : ''}`;
      
      balanceItem.innerHTML = `
        <div class="asset-info">
          <img src="images/${currency.icon}" alt="${currency.name} Icon" class="asset-icon">
          <span class="asset-name">${currency.name} <span class="asset-fullname">(${currency.fullName})</span></span>
        </div>
        <div class="asset-value">
          <span class="asset-amount">${formatCryptoAmount(balance, currency.key)}</span>
          <span class="asset-est-value">${currency.key === 'ubt' ? '(Bonus Token)' : `$ ${usdValue.toFixed(2)} USD`}</span>
        </div>
      `;
      
      balancesList.appendChild(balanceItem);
    });
    
    // Update total value
    if (totalValueElement) {
      totalValueElement.textContent = `$ ${totalValue.toFixed(2)} USD`;
    }
    
    // Also update global balance
    updateGlobalBalanceDisplay();
  }
  
  // Update purchased bots UI
  function updatePurchasedBots(bots) {
    if (!purchasedBotsContainer) return;
    
    // Clear existing content except the empty message
    const children = Array.from(purchasedBotsContainer.children);
    children.forEach(child => {
      if (!child.classList.contains('empty-bots-message')) {
        purchasedBotsContainer.removeChild(child);
      }
    });
    
    // If no bots, show empty message
    if (!bots || bots.length === 0) {
      if (emptyBotsMessage) {
        emptyBotsMessage.style.display = 'block';
      }
      return;
    }
    
    // Hide empty message
    if (emptyBotsMessage) {
      emptyBotsMessage.style.display = 'none';
    }
    
    // Create bot summary table
    const botTable = document.createElement('table');
    botTable.className = 'bot-summary-table';
    botTable.innerHTML = `
      <thead>
        <tr>
          <th>Bot Name</th>
          <th>Purchase Date</th>
          <th>Cost (UBT)</th>
          <th>Payments Received</th>
          <th>Status</th>
          <th>Remaining Days</th>
        </tr>
      </thead>
      <tbody>
        <!-- Bot rows will be added here -->
      </tbody>
    `;
    
    const tableBody = botTable.querySelector('tbody');
    
    // Add each bot to the table
    bots.forEach(bot => {
      const row = document.createElement('tr');
      
      // Calculate payments received
      const dailyPayment = bot.dailyPayment || 0;
      const daysActive = calculateDaysActive(bot.purchaseDate);
      const bonusPayments = calculateBonusPayments(bot, daysActive);
      const totalPayments = (dailyPayment * Math.min(daysActive, bot.lockPeriod)) + bonusPayments;
      
      // Calculate remaining days
      const remainingDays = Math.max(0, bot.lockPeriod - daysActive);
      
      // Determine status
      let status = 'Active';
      if (daysActive >= bot.lockPeriod) {
        status = 'Completed';
      } else if (daysActive < 1) {
        status = 'Pending';
      }
      
      // Format purchase date
      const purchaseDate = new Date(bot.purchaseDate);
      const formattedDate = purchaseDate.toISOString().split('T')[0];
      
      row.innerHTML = `
        <td>${bot.name}</td>
        <td>${formattedDate}</td>
        <td>${bot.cost} UBT</td>
        <td>${totalPayments.toFixed(2)} UBT</td>
        <td>${status}</td>
        <td>${remainingDays}</td>
      `;
      
      tableBody.appendChild(row);
    });
    
    // Add table to container
    purchasedBotsContainer.appendChild(botTable);
    
    // Add detailed summary section
    const detailedSummary = document.createElement('div');
    detailedSummary.className = 'bot-detailed-summary';
    
    // Calculate totals
    const totalCost = bots.reduce((sum, bot) => sum + bot.cost, 0);
    const totalPaymentsReceived = bots.reduce((sum, bot) => {
      const daysActive = calculateDaysActive(bot.purchaseDate);
      const bonusPayments = calculateBonusPayments(bot, daysActive);
      return sum + ((bot.dailyPayment || 0) * Math.min(daysActive, bot.lockPeriod)) + bonusPayments;
    }, 0);
    
    // Calculate future payments
    const totalFuturePayments = bots.reduce((sum, bot) => {
      const daysActive = calculateDaysActive(bot.purchaseDate);
      const remainingDays = Math.max(0, bot.lockPeriod - daysActive);
      const remainingDailyPayments = (bot.dailyPayment || 0) * remainingDays;
      const remainingBonusPayments = calculateRemainingBonusPayments(bot, daysActive);
      const returnedPrincipal = daysActive >= bot.lockPeriod ? 0 : bot.cost;
      return sum + remainingDailyPayments + remainingBonusPayments + returnedPrincipal;
    }, 0);
    
    detailedSummary.innerHTML = `
      <h3>Bot Investment Summary</h3>
      <div class="summary-stats">
        <div class="summary-stat">
          <span class="stat-value">${totalCost} UBT</span>
          <span class="stat-label">Total Investment</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value">${totalPaymentsReceived.toFixed(2)} UBT</span>
          <span class="stat-label">Total Payments Received</span>
        </div>
        <div class="summary-stat">
          <span class="stat-value">${totalFuturePayments.toFixed(2)} UBT</span>
          <span class="stat-label">Expected Future Payments</span>
        </div>
      </div>
      <p class="info-text">Note: Future payments include daily profits, bonuses, and returned principal at the end of lock periods.</p>
    `;
    
    purchasedBotsContainer.appendChild(detailedSummary);
  }
  
  // Calculate days active for a bot
  function calculateDaysActive(purchaseDate) {
    const purchase = new Date(purchaseDate);
    const now = new Date();
    const diffTime = Math.abs(now - purchase);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  // Calculate bonus payments received
  function calculateBonusPayments(bot, daysActive) {
    let bonusPayments = 0;
    
    // Check if bot has bonus structure
    if (!bot.bonuses || !bot.bonuses.length) {
      return bonusPayments;
    }
    
    // Add up all bonuses that have been paid
    bot.bonuses.forEach(bonus => {
      if (daysActive >= bonus.day) {
        bonusPayments += bonus.amount;
      }
    });
    
    return bonusPayments;
  }
  
  // Calculate remaining bonus payments
  function calculateRemainingBonusPayments(bot, daysActive) {
    let remainingBonuses = 0;
    
    // Check if bot has bonus structure
    if (!bot.bonuses || !bot.bonuses.length) {
      return remainingBonuses;
    }
    
    // Add up all bonuses that have not been paid yet
    bot.bonuses.forEach(bonus => {
      if (daysActive < bonus.day && bonus.day <= bot.lockPeriod) {
        remainingBonuses += bonus.amount;
      }
    });
    
    return remainingBonuses;
  }
  
  // Create mock bot data for testing
  function createMockBotData() {
    if (!purchasedBotsContainer) return;
    
    // Hide empty message
    if (emptyBotsMessage) {
      emptyBotsMessage.style.display = 'none';
    }
    
    // Mock bots data
    const mockBots = [
      {
        name: 'Starter Bot',
        purchaseDate: '2025-03-15',
        cost: 100,
        dailyPayment: 10,
        lockPeriod: 2,
        bonuses: []
      },
      {
        name: 'Standard Bot',
        purchaseDate: '2025-03-10',
        cost: 500,
        dailyPayment: 10,
        lockPeriod: 14,
        bonuses: []
      },
      {
        name: 'Premium Bot',
        purchaseDate: '2025-03-01',
        cost: 3000,
        dailyPayment: 10,
        lockPeriod: 30,
        bonuses: [
          { day: 3, amount: 300 }
        ]
      }
    ];
    
    // Update UI with mock data
    updatePurchasedBots(mockBots);
  }
  
  // Format crypto amount based on currency
  function formatCryptoAmount(amount, currency) {
    if (currency === 'btc' || currency === 'eth') {
      return amount.toFixed(8);
    } else {
      return amount.toFixed(2);
    }
  }
  
  // Show withdrawal modal
  function showWithdrawalModal() {
    // Create modal HTML
    const modalHTML = `
      <div class="modal" id="withdrawModal">
        <div class="modal-content">
          <h2>Withdraw Funds</h2>
          <p>Please enter withdrawal details.</p>
          <div class="form-group">
            <label for="withdrawCurrency">Currency</label>
            <select id="withdrawCurrency">
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="USDT">Tether (USDT)</option>
              <option value="UBT">Un-Buyable Token</option>
            </select>
          </div>
          <div class="form-group">
            <label for="withdrawAmount">Amount</label>
            <input type="number" id="withdrawAmount" step="0.00000001" min="0" placeholder="0.00" required>
          </div>
          <div class="form-group">
            <label for="withdrawAddress">Wallet Address</label>
            <input type="text" id="withdrawAddress" placeholder="Enter destination wallet address" required>
          </div>
          <div class="form-group">
            <p class="info-text">Note: Withdrawal requests are processed manually by our team. You will be notified once your withdrawal is processed.</p>
          </div>
          <button class="btn btn-primary" id="submitWithdrawal">Submit Withdrawal</button>
          <button class="btn btn-secondary" id="cancelWithdrawal">Cancel</button>
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('withdrawModal');
    const submitBtn = document.getElementById('submitWithdrawal');
    const cancelBtn = document.getElementById('cancelWithdrawal');
    const currencySelect = document.getElementById('withdrawCurrency');
    const amountInput = document.getElementById('withdrawAmount');
    const addressInput = document.getElementById('withdrawAddress');
    
    // Show modal
    modal.style.display = 'flex';
    
    // Handle currency change
    currencySelect.addEventListener('change', async () => {
      const currency = currencySelect.value.toLowerCase();
      // Get fresh balance data from API
      const userData = await fetchUserData();
      const balances = userData?.balances || {};
      const balance = balances[currency] || 0;
      
      amountInput.max = balance;
      amountInput.placeholder = `Max: ${balance}`;
    });
    
    // Trigger change event to set initial max
    currencySelect.dispatchEvent(new Event('change'));
    
    // Handle submit
    submitBtn.addEventListener('click', async () => {
      const currency = currencySelect.value;
      const amount = parseFloat(amountInput.value);
      const address = addressInput.value.trim();
      
      if (!amount || amount <= 0) {
        showMessage('Please enter a valid amount', 'error');
        return;
      }
      
      if (!address) {
        showMessage('Please enter a valid wallet address', 'error');
        return;
      }
      
      try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/api/transactions/withdraw`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify({
            currency,
            amount,
            walletAddress: address
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.msg || 'Withdrawal request failed');
        }
        
        showMessage('Withdrawal request submitted successfully!', 'success');
        modal.remove();
        
        // Refresh user data
        await fetchAssetData();
        // Update global balance
        await updateGlobalBalanceDisplay();
      } catch (error) {
        showMessage(error.message, 'error');
      }
    });
    
    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
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
  
  // Initialize
  fetchAssetData();
  
  // Add console logging for debugging
  console.log("Asset Center page loaded.");
  
  // Debug function to check balance
  async function debugCheckBalance() {
    const userData = await fetchUserData();
    console.log("UBT Balance displayed:", userData?.balances?.ubt || 0);
  }
  
  // Run debug check
  debugCheckBalance();
});
