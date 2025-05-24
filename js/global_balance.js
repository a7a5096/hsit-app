// Global balance component for HSIT app
// This script adds a consistent balance display across all pages

const API_URL = 'https://hsit-backend.onrender.com';

document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    // Don't show balance for non-logged in users
    return;
  }

  // Create the global balance element
  createGlobalBalanceElement();
  
  // Fetch and update the balance
  fetchAndUpdateBalance(token);
  
  // Set up periodic refresh (every 30 seconds)
  setInterval(() => {
    fetchAndUpdateBalance(token);
  }, 30000);
});

// Function to create the global balance element
function createGlobalBalanceElement() {
  // Check if the element already exists
  if (document.getElementById('global-balance-container')) {
    return;
  }
  
  // Create the container
  const balanceContainer = document.createElement('div');
  balanceContainer.id = 'global-balance-container';
  balanceContainer.className = 'global-balance-container';
  
  // Set styles
  Object.assign(balanceContainer.style, {
    position: 'fixed',
    top: '0',
    right: '0',
    backgroundColor: '#1a1a2e',
    color: 'white',
    padding: '8px 15px',
    borderBottomLeftRadius: '8px',
    zIndex: '1000',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 'bold'
  });
  
  // Create the content
  balanceContainer.innerHTML = `
    <div style="margin-right: 8px;">Balance:</div>
    <div id="global-ubt-balance" style="color: #4CAF50;">Loading...</div>
  `;
  
  // Add to the document
  document.body.appendChild(balanceContainer);
}

// Function to fetch and update the balance
async function fetchAndUpdateBalance(token) {
  try {
    const response = await fetch(`${API_URL}/api/auth`, {
      headers: {
        'x-auth-token': token
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    
    const userData = await response.json();
    
    // Update the balance display
    const balanceElement = document.getElementById('global-ubt-balance');
    if (balanceElement) {
      balanceElement.textContent = `${userData.balances?.ubt.toFixed(2) || '0.00'} UBT`;
    }
    
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    const balanceElement = document.getElementById('global-ubt-balance');
    if (balanceElement) {
      balanceElement.textContent = 'Error loading balance';
    }
    return null;
  }
}
