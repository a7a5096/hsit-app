document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const coinRadios = document.querySelectorAll('input[name="crypto"]');
  const addressInput = document.getElementById('cryptoAddress');
  const copyButton = document.getElementById('copyAddressBtn');
  const qrCodeArea = document.getElementById('qrCodeArea');
  const selectedCoinName = document.getElementById('selectedCoinName');
  const minDepositSpan = document.getElementById('minDeposit');
  
  // Get auth token from localStorage
  const token = localStorage.getItem('token');
  
  // Define API base URL
  const API_BASE_URL = window.location.hostname.includes('localhost') ? 'http://localhost:5000' : '';
  
  // Coin details
  const coinDetailsBase = {
    BTC: { name: 'Bitcoin (BTC)', min: '0.001 BTC'},
    ETH: { name: 'Ethereum (ETH)', min: '0.01 ETH'},
    USDT: { name: 'Tether (USDT - ERC20)', min: '10 USDT'}
  };
  
  // Fetch user's crypto addresses
  async function fetchUserAddresses() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deposit/addresses`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      
      const data = await response.json();
      return {
        btc_address: data.btcAddress,
        eth_address: data.ethAddress,
        usdt_address: data.usdtAddress
      };
    } catch (error) {
      console.error('Error fetching addresses:', error);
      showMessage('Error loading your deposit addresses. Please try again later.', 'error');
      return null;
    }
  }
  
  // Generate QR code
  async function fetchQRCode(currency) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crypto/qrcode/${currency}`, {
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
    
    // Fetch addresses if not already loaded
    if (!window.userAddresses) {
      window.userAddresses = await fetchUserAddresses();
    }
    
    if (!window.userAddresses) {
      addressInput.value = 'Error loading addresses';
      return;
    }
    
    let currentAddress = null;
    
    if (selectedValue === 'BTC') {
      currentAddress = window.userAddresses.btc_address;
    } else if (selectedValue === 'ETH') {
      currentAddress = window.userAddresses.eth_address;
    } else if (selectedValue === 'USDT') {
      currentAddress = window.userAddresses.usdt_address;
    }
    
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
        qrCodeArea.innerHTML = `<img src="${qrData.qrPath}" alt="${selectedValue} QR Code" class="qr-code">`;
      } else {
        qrCodeArea.innerHTML = '<p>[QR Code unavailable]</p>';
      }
    } else {
      addressInput.value = 'Address not available';
      selectedCoinName.textContent = detailsBase ? detailsBase.name : 'Error';
      minDepositSpan.textContent = detailsBase ? detailsBase.min : 'N/A';
      copyButton.disabled = true;
      qrCodeArea.innerHTML = '<p>[Address unavailable]</p>';
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
