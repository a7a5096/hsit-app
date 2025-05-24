// Global data management utility
// This module provides centralized functions for all data operations

// API configuration
const API_URL = 'https://hsit-backend.onrender.com';

// Get authentication token (only thing that should use localStorage)
function getAuthToken() {
  return localStorage.getItem('token');
}

// Check if user is authenticated
function isAuthenticated() {
  return !!getAuthToken();
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// Fetch user data from backend API
async function fetchUserData(forceRefresh = false) {
  const token = getAuthToken();
  if (!token) {
    console.error("No authentication token available");
    return null;
  }

  try {
    // Add cache-busting parameter when force refreshing
    const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
    
    const response = await fetch(`${API_URL}/api/auth${cacheBuster}`, {
      headers: {
        'x-auth-token': token,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }
    
    const userData = await response.json();
    
    // Log for debugging
    console.log("User data from API:", userData);
    
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

// Fetch user balance for specific currency
async function getUserBalance(currency = 'ubt', forceRefresh = false) {
  try {
    // Direct API call to get balance specifically
    const token = getAuthToken();
    if (!token) {
      console.error("No authentication token available");
      return 0;
    }
    
    // Add cache-busting parameter when force refreshing
    const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
    
    const response = await fetch(`${API_URL}/api/ubt/balance${cacheBuster}`, {
      headers: {
        'x-auth-token': token,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Balance data from API:", data);
    
    // Return the balance for the requested currency
    return data.balance || 0;
  } catch (error) {
    console.error('Error fetching balance:', error);
    
    // Fallback to user data if direct balance API fails
    const userData = await fetchUserData(forceRefresh);
    if (!userData || !userData.balances) {
      return 0;
    }
    
    return userData.balances[currency.toLowerCase()] || 0;
  }
}

// Update global balance display if it exists
async function updateGlobalBalanceDisplay(forceRefresh = false) {
  const balanceElement = document.getElementById('global-ubt-balance');
  if (!balanceElement) return;
  
  try {
    const balance = await getUserBalance('ubt', forceRefresh);
    balanceElement.textContent = `${balance.toFixed(2)} UBT`;
    
    // Log for debugging
    console.log("Updated global balance display:", balance);
    
    return balance;
  } catch (error) {
    console.error('Error updating global balance display:', error);
    balanceElement.textContent = 'Error loading balance';
    return null;
  }
}

// Create and initialize global balance display
async function initGlobalBalanceDisplay() {
  if (!isAuthenticated()) return;
  
  // Check if the element already exists
  if (document.getElementById('global-balance-container')) {
    // If it exists, just update the balance
    await updateGlobalBalanceDisplay(true);
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
  
  // Update the balance display
  await updateGlobalBalanceDisplay(true);
  
  // Set up periodic refresh (every 30 seconds)
  setInterval(() => updateGlobalBalanceDisplay(true), 30000);
}

// Global function to refresh user data
window.refreshUserDataFromBackend = async function() {
  console.log("Refreshing user data from backend...");
  await fetchUserData(true);
  await updateGlobalBalanceDisplay(true);
  console.log("User data refresh complete");
};

// Export all functions
export {
  getAuthToken,
  isAuthenticated,
  requireAuth,
  fetchUserData,
  getUserBalance,
  updateGlobalBalanceDisplay,
  initGlobalBalanceDisplay
};
