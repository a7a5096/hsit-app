// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';

// Script to handle deposit functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  // Elements
  const coinRadios = document.querySelectorAll('input[name="crypto"]');
  const addressInput = document.getElementById('deposit-address');
  const copyButton = document.getElementById('copy-button');
  const selectedCoinName = document.getElementById('selected-coin-name');
  const minDepositSpan = document.getElementById('min-deposit');
  const qrCodeArea = document.getElementById('qr-code-area');
  
  // Coin details
  const coinDetailsBase = {
    BTC: { name: 'Bitcoin (BTC)', min: '0.001 BTC', apiName: 'bitcoin'},
    ETH: { name: 'Ethereum (ETH)', min: '0.01 ETH', apiName: 'ethereum'},
    USDT: { name: 'Tether (USDT - ERC20)', min: '10 USDT', apiName: 'usdt'}
  };
  
  // Fetch user's crypto addresses - updated to use new database-driven API
  async function fetchUserAddresses() {
    try {
      const response = await fetch(`${API_URL}/api/crypto/addresses`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      
      const data = await response.json();
      
      // Handle the new response format from the database-driven API
      if (data.success) {
        return {
          btc_address: data.addresses.bitcoin,
          eth_address: data.addresses.ethereum,
          usdt_address: data.addresses.usdt
        };
      } else {
        throw new Error(data.message || 'Failed to fetch addresses');
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      showMessage('Error loading your deposit addresses. Please try again later.', 'error');
      return null;
    }
  }
  
  // Get specific crypto address - new function to use the database-driven endpoint
  async function getCryptoAddress(currency) {
    try {
      const apiCurrency = coinDetailsBase[currency]?.apiName || currency.toLowerCase();
      
      const response = await fetch(`${API_URL}/api/crypto/address/${apiCurrency}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get address');
      }
      
      const data = await response.json();
      
      if (data.success && data.address) {
        return data.address;
      } else {
        throw new Error(data.message || 'Address not available');
      }
    } catch (error) {
      console.error(`Error getting ${currency} address:`, error);
      return null;
    }
  }
  
  // Generate QR code - updated to use new database-driven API
  async function fetchQRCode(currency) {
    try {
      const apiCurrency = coinDetailsBase[currency]?.apiName || currency.toLowerCase();
      
      const response = await fetch(`${API_URL}/api/crypto/qrcode/${apiCurrency}`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }
  
  // Update deposit info based on selected currency
  async function updateDepositInfo() {
    const selectedValue = document.querySelector('input[name="crypto"]:checked').value;
    const detailsBase = coinDetailsBase[selectedValue];
    
    // Show loading state
    addressInput.value = 'Loading your address...';
    copyButton.disabled = true;
    qrCodeArea.innerHTML = '<p>[Loading...]</p>';
    
    // Get the specific address for the selected currency
    const currentAddress = await getCryptoAddress(selectedValue);
    
    if (detailsBase && currentAddress) {
      addressInput.value = currentAddress;
      selectedCoinName.textContent = detailsBase.name;
      minDepositSpan.textContent = detailsBase.min;
      copyButton.disabled = false;
      
      // Update warning text
      const warningElement = document.querySelector('.warning-text');
      if (warningElement) {
        warningElement.innerHTML = `⚠️ Send only <strong>${detailsBase.name}</strong> to this address. Sending any other coin may result in permanent loss.`;
      }
      
      // Fetch QR code
      const qrData = await fetchQRCode(selectedValue);
      if (qrData && qrData.qrPath) {
        qrCodeArea.innerHTML = `<img src="${API_URL}${qrData.qrPath}" alt="${selectedValue} QR Code" class="qr-code">`;
      } else {
        qrCodeArea.innerHTML = '<p>[QR Code unavailable]</p>';
      }
    } else {
      addressInput.value = 'Address not available';
      selectedCoinName.textContent = detailsBase ? detailsBase.name : 'Error';
      minDepositSpan.textContent = detailsBase ? detailsBase.min : 'N/A';
      copyButton.disabled = true;
      qrCodeArea.innerHTML = '<p>[Address unavailable]</p>';
      
      // Show error message
      showMessage('Failed to load deposit address. Please try again later.', 'error');
    }
  }
  
  // Add event listeners
  if (coinRadios.length > 0) {
    coinRadios.forEach(radio => {
      radio.addEventListener('change', updateDepositInfo);
    });
    
    // Initialize with first selection
    updateDepositInfo();
  }
  
  // Copy button functionality
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      if (copyButton.disabled || !addressInput.value || addressInput.value.includes('...')) return;
      
      addressInput.select();
      addressInput.setSelectionRange(0, 99999); // For mobile devices
      
      try {
        navigator.clipboard.writeText(addressInput.value).then(() => {
          copyButton.textContent = 'Copied!';
          setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
        }).catch(err => {
          console.error('Clipboard API failed: ', err);
          // Basic fallback
          if (document.execCommand('copy')) {
            copyButton.textContent = 'Copied!';
            setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
          } else {
            alert('Failed to copy automatically. Please copy manually.');
          }
        });
      } catch (err) {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy address. Please copy it manually.');
      }
    });
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
