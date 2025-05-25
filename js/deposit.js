// Updated deposit.js for robust database-driven address assignment
// This script handles the deposit page functionality and crypto address display

document.addEventListener('DOMContentLoaded', async function() {
  console.log("Deposit page initializing...");
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }
  
  // Elements
  const cryptoSelector = document.querySelectorAll('input[name="crypto"]');
  const depositAddressContainer = document.getElementById('depositAddress');
  const depositAddressDisplay = document.getElementById('depositAddressDisplay');
  const copyButton = document.getElementById('copyAddress');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const warningMessage = document.getElementById('warningMessage');
  const qrCodeContainer = document.getElementById('qrCode');
  
  // API URL
  const API_URL = 'https://hsit-backend.onrender.com';
  
  // Selected cryptocurrency
  let selectedCrypto = 'bitcoin';
  
  // Initialize
  initializePage();
  
  // Initialize the page
  async function initializePage() {
    // Set default selection
    document.querySelector('input[value="bitcoin"]').checked = true;
    
    // Add event listeners to crypto selector
    cryptoSelector.forEach(radio => {
      radio.addEventListener('change', handleCryptoChange);
    });
    
    // Add event listener to copy button
    if (copyButton) {
      copyButton.addEventListener('click', copyAddressToClipboard);
    }
    
    // Load initial address
    await loadDepositAddress('bitcoin');
  }
  
  // Handle crypto selection change
  async function handleCryptoChange(event) {
    selectedCrypto = event.target.value;
    console.log(`Selected crypto changed to: ${selectedCrypto}`);
    
    // Update warning message
    updateWarningMessage(selectedCrypto);
    
    // Load deposit address for selected crypto
    await loadDepositAddress(selectedCrypto);
  }
  
  // Load deposit address from backend
  async function loadDepositAddress(crypto) {
    try {
      // Show loading indicator
      if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
      }
      if (depositAddressDisplay) {
        depositAddressDisplay.textContent = 'Loading your address...';
      }
      if (qrCodeContainer) {
        qrCodeContainer.innerHTML = '';
      }
      
      console.log(`Fetching ${crypto} deposit address from backend...`);
      
      // Make API call to get address
      const response = await fetch(`${API_URL}/api/crypto/address/${crypto}`, {
        method: 'GET',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch address: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Address data received:', data);
      
      if (!data.success || !data.address) {
        throw new Error('No address returned from server');
      }
      
      // Display the address
      if (depositAddressDisplay) {
        depositAddressDisplay.textContent = data.address;
      }
      
      // Generate QR code
      await generateQRCode(data.address, crypto);
      
      // Update warning message
      updateWarningMessage(crypto);
      
      return data.address;
    } catch (error) {
      console.error('Error loading deposit address:', error);
      
      if (depositAddressDisplay) {
        depositAddressDisplay.textContent = 'Error loading address. Please try again.';
      }
      
      return null;
    } finally {
      // Hide loading indicator
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    }
  }
  
  // Generate QR code for the address
  async function generateQRCode(address, crypto) {
    if (!qrCodeContainer) return;
    
    try {
      // Fetch QR code from backend
      const response = await fetch(`${API_URL}/api/crypto/qrcode/${crypto}`, {
        method: 'GET',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        // Fallback to client-side QR code generation
        console.log('Using fallback QR code generation');
        
        // Clear container
        qrCodeContainer.innerHTML = '';
        
        // Create QR code using qrcode.js library
        if (typeof QRCode !== 'undefined') {
          new QRCode(qrCodeContainer, {
            text: address,
            width: 128,
            height: 128,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
        } else {
          // If QRCode library is not available, show text message
          qrCodeContainer.innerHTML = '<p>QR Code not available</p>';
        }
        
        return;
      }
      
      const data = await response.json();
      console.log('QR code data received:', data);
      
      if (!data.success || !data.qrPath) {
        throw new Error('No QR code returned from server');
      }
      
      // Display the QR code
      qrCodeContainer.innerHTML = `<img src="${API_URL}${data.qrPath}" alt="${crypto} deposit address QR code" width="128" height="128">`;
    } catch (error) {
      console.error('Error generating QR code:', error);
      qrCodeContainer.innerHTML = '<p>QR Code not available</p>';
    }
  }
  
  // Update warning message based on selected crypto
  function updateWarningMessage(crypto) {
    if (!warningMessage) return;
    
    let cryptoName = 'cryptocurrency';
    switch (crypto) {
      case 'bitcoin':
        cryptoName = 'Bitcoin (BTC)';
        break;
      case 'ethereum':
        cryptoName = 'Ethereum (ETH)';
        break;
      case 'usdt':
        cryptoName = 'Tether (USDT - ERC20)';
        break;
      default:
        cryptoName = crypto.toUpperCase();
    }
    
    warningMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Send only ${cryptoName} to this address. Sending any other coin may result in permanent loss.`;
  }
  
  // Copy address to clipboard
  function copyAddressToClipboard() {
    if (!depositAddressDisplay) return;
    
    const address = depositAddressDisplay.textContent;
    if (!address || address === 'Loading your address...' || address === 'Error loading address. Please try again.') {
      return;
    }
    
    // Create temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = address;
    document.body.appendChild(tempInput);
    
    // Select and copy
    tempInput.select();
    document.execCommand('copy');
    
    // Remove temporary element
    document.body.removeChild(tempInput);
    
    // Show copied message
    if (copyButton) {
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    }
  }
});
