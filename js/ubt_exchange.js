// Script to handle UBT exchange functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  // Get user data
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  // Create UBT exchange section
  const mainElement = document.querySelector('.page-main');
  if (mainElement) {
    // Create UBT exchange section
    const exchangeSection = document.createElement('section');
    exchangeSection.className = 'content-section card-style';
    exchangeSection.innerHTML = `
      <h2>UBT Exchange</h2>
      <div class="exchange-info">
        <p>Exchange your crypto for UBT tokens or convert UBT back to USDT.</p>
        <div class="exchange-rates">
          <div class="rate-item">
            <span class="rate-label">Current Buy Rate:</span>
            <span class="rate-value" id="buy-rate">Loading...</span>
          </div>
          <div class="rate-item">
            <span class="rate-label">Current Sell Rate:</span>
            <span class="rate-value" id="sell-rate">Loading...</span>
          </div>
        </div>
      </div>
      <div class="exchange-form">
        <div class="form-group">
          <label for="exchange-type">Exchange Type</label>
          <select id="exchange-type">
            <option value="buy">Buy UBT</option>
            <option value="sell">Sell UBT</option>
          </select>
        </div>
        <div id="buy-options">
          <div class="form-group">
            <label for="source-currency">Source Currency</label>
            <select id="source-currency">
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="exchange-amount">Amount</label>
          <input type="number" id="exchange-amount" step="0.01" min="0" placeholder="0.00">
          <span id="max-amount"></span>
        </div>
        <div class="form-group">
          <label>You will receive:</label>
          <div class="exchange-result" id="exchange-result">0.00 UBT</div>
        </div>
        <button class="btn btn-primary" id="execute-exchange">Execute Exchange</button>
      </div>
    `;
    
    // Add to main
    mainElement.appendChild(exchangeSection);
    
    // Get elements
    const exchangeTypeSelect = document.getElementById('exchange-type');
    const sourceCurrencySelect = document.getElementById('source-currency');
    const buyOptionsDiv = document.getElementById('buy-options');
    const amountInput = document.getElementById('exchange-amount');
    const maxAmountSpan = document.getElementById('max-amount');
    const resultDiv = document.getElementById('exchange-result');
    const executeButton = document.getElementById('execute-exchange');
    const buyRateSpan = document.getElementById('buy-rate');
    const sellRateSpan = document.getElementById('sell-rate');
    
    // Fetch exchange rates
    async function fetchExchangeRates() {
      try {
        const response = await fetch('/api/transactions/exchange-rates');
        
        if (!response.ok) {
          throw new Error('Failed to fetch exchange rates');
        }
        
        const rates = await response.json();
        
        // Update UI
        buyRateSpan.textContent = `${rates.buyRate.toFixed(4)} USDT per UBT`;
        sellRateSpan.textContent = `${rates.sellRate.toFixed(4)} USDT per UBT`;
        
        // Store rates
        window.exchangeRates = rates;
        
        return rates;
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
        showMessage('Error loading exchange rates. Please try again later.', 'error');
        return null;
      }
    }
    
    // Fetch user data
    async function fetchUserData() {
      try {
        const response = await fetch('/api/auth', {
          headers: {
            'x-auth-token': token
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const userData = await response.json();
        
        // Store user data
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Update max amount
        updateMaxAmount();
        
        return userData;
      } catch (error) {
        console.error('Error fetching user data:', error);
        showMessage('Error loading your account data. Please try again later.', 'error');
        return null;
      }
    }
    
    // Update max amount based on selected currency
    function updateMaxAmount() {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const balances = userData.balances || {};
      
      let currency;
      if (exchangeTypeSelect.value === 'buy') {
        currency = sourceCurrencySelect.value;
      } else {
        currency = 'UBT';
      }
      
      const balance = balances[currency.toLowerCase()] || 0;
      maxAmountSpan.textContent = `Max: ${balance}`;
      amountInput.max = balance;
    }
    
    // Calculate exchange result
    function calculateExchangeResult() {
      if (!window.exchangeRates) return;
      
      const amount = parseFloat(amountInput.value) || 0;
      const exchangeType = exchangeTypeSelect.value;
      
      let result = 0;
      if (exchangeType === 'buy') {
        // Buy UBT with crypto
        result = amount / window.exchangeRates.buyRate;
        resultDiv.textContent = `${result.toFixed(2)} UBT`;
      } else {
        // Sell UBT for USDT
        result = amount * window.exchangeRates.sellRate;
        resultDiv.textContent = `${result.toFixed(2)} USDT`;
      }
    }
    
    // Execute exchange
    async function executeExchange() {
      const amount = parseFloat(amountInput.value) || 0;
      if (amount <= 0) {
        showMessage('Please enter a valid amount', 'error');
        return;
      }
      
      const exchangeType = exchangeTypeSelect.value;
      
      try {
        let response;
        
        if (exchangeType === 'buy') {
          // Buy UBT with crypto
          response = await fetch('/api/transactions/buy-ubt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            body: JSON.stringify({
              sourceCurrency: sourceCurrencySelect.value,
              amount
            })
          });
        } else {
          // Sell UBT for USDT
          response = await fetch('/api/transactions/withdraw', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': token
            },
            body: JSON.stringify({
              currency: 'UBT',
              amount,
              walletAddress: 'INTERNAL_EXCHANGE' // Special marker for internal exchange
            })
          });
        }
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.msg || 'Exchange failed');
        }
        
        showMessage(exchangeType === 'buy' ? 'UBT purchase successful!' : 'UBT exchange request submitted!', 'success');
        
        // Reset form
        amountInput.value = '';
        resultDiv.textContent = '0.00 ' + (exchangeType === 'buy' ? 'UBT' : 'USDT');
        
        // Refresh user data
        fetchUserData();
      } catch (error) {
        showMessage(error.message, 'error');
      }
    }
    
    // Add event listeners
    exchangeTypeSelect.addEventListener('change', function() {
      if (this.value === 'buy') {
        buyOptionsDiv.style.display = 'block';
        resultDiv.textContent = '0.00 UBT';
      } else {
        buyOptionsDiv.style.display = 'none';
        resultDiv.textContent = '0.00 USDT';
      }
      
      updateMaxAmount();
      calculateExchangeResult();
    });
    
    sourceCurrencySelect.addEventListener('change', function() {
      updateMaxAmount();
      calculateExchangeResult();
    });
    
    amountInput.addEventListener('input', calculateExchangeResult);
    
    executeButton.addEventListener('click', executeExchange);
    
    // Initialize
    fetchExchangeRates();
    fetchUserData();
  }
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
