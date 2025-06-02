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
  const API_URL = 'https://hsit-backend.onrender.com';

  // Coin details
  const coinDetailsBase = {
    BTC: { name: 'Bitcoin (BTC)', min: '0.001 BTC'},
    ETH: { name: 'Ethereum (ETH)', min: '0.01 ETH'},
    USDT: { name: 'Tether (USDT - ERC20)', min: '10 USDT'}
  };

  // Fetch user's crypto addresses
  async function fetchUserAddresses() {
    try {
      const response = await fetch(`${API_URL}/api/deposit/addresses`, {
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

  // Update deposit info based on selected currency
  async function updateDepositInfo() {
    if (!addressInput || !copyButton || !qrCodeArea || !selectedCoinName || !minDepositSpan) {
      console.error('Deposit Script Error: One or more required HTML elements are missing.');
      return;
    }
    const selectedRadio = document.querySelector('input[name="crypto"]:checked');
    if (!selectedRadio) {
      return;
    }
    const selectedValue = selectedRadio.value;
    const detailsBase = coinDetailsBase[selectedValue];
    addressInput.value = 'Loading your address...';
    copyButton.disabled = true;
    qrCodeArea.innerHTML = '<p>[Loading...]</p>';
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
      const warningElement = document.querySelector('.warning-text');
      if (warningElement) {
        warningElement.innerHTML = `⚠️ Send only <strong>${detailsBase.name}</strong> to this address. Sending any other coin may result in permanent loss.`;
      }
      
      // *** FIX: Generate QR Code on the client-side ***
      qrCodeArea.innerHTML = ''; // Clear previous QR code or "Loading" text
      new QRCode(qrCodeArea, {
        text: currentAddress,
        width: 150,
        height: 150,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });

    } else {
      addressInput.value = 'Address not available';
      selectedCoinName.textContent = detailsBase ? detailsBase.name : 'Error';
      minDepositSpan.textContent = detailsBase ? detailsBase.min : 'N/A';
      copyButton.disabled = true;
      qrCodeArea.innerHTML = '<p>[Address unavailable]</p>';
    }
  }

  if (coinRadios.length > 0) {
    coinRadios.forEach(radio => {
      radio.addEventListener('change', updateDepositInfo);
    });
    if (document.querySelector('input[name="crypto"]:checked')) {
      updateDepositInfo();
    }
  }

  if (copyButton) {
    copyButton.addEventListener('click', () => {
      if (copyButton.disabled || !addressInput.value || addressInput.value.includes('...')) return;
      addressInput.select();
      addressInput.setSelectionRange(0, 99999);
      try {
        navigator.clipboard.writeText(addressInput.value).then(() => {
          copyButton.textContent = 'Copied!';
          setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
        });
      } catch (err) {
        alert('Failed to copy address. Please copy it manually.');
      }
    });
  }
});

function showMessage(message, type = 'info') {
  let statusElement = document.getElementById('statusMessage');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'statusMessage';
    statusElement.className = 'status-message';
    document.body.prepend(statusElement);
  }
  statusElement.textContent = message;
  statusElement.className = `status-message ${type}`;
  statusElement.style.display = 'block';
  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 5000);
}
