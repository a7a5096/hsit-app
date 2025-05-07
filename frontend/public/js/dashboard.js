// Dashboard.js with CORS-enabled API configuration
// No external config dependency - completely self-contained

// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';

// Script to handle dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  // Get user data
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  // Elements
  const usernameElement = document.querySelector('.user-greeting');
  const balanceElement = document.querySelector('.balance-amount');
  const botsList = document.querySelector('.bots-list');
  
  // Update user greeting
  if (usernameElement && userData.username) {
    usernameElement.textContent = `Welcome, ${userData.username}!`;
  }
  
  // Fetch user data
  async function fetchUserData() {
    console.log("dashboard.js: Attempting to fetch user data."); // DEBUG
    const token = localStorage.getItem("token"); // Re-fetch token just in case, though it should be available from above
    console.log("dashboard.js: Token for fetchUserData:", token ? "[PRESENT]" : "[MISSING]"); // DEBUG
    if (!token) {
        console.error("dashboard.js: No token found before fetching user data. Redirecting.");
        showMessage("Authentication error. Please log in again.", "error");
        // window.location.href = "/index.html"; // Avoid redirecting immediately if already on dashboard and token vanished
        return null;
    }

    const fetchUrl = `${API_URL}/api/auth`;
    console.log("dashboard.js: Fetching from URL:", fetchUrl); // DEBUG

    try {
      console.log("dashboard.js: About to make fetch request to:", fetchUrl); // DEBUG
      const response = await fetch(fetchUrl, {
        headers: {
          "x-auth-token": token,
          "Origin": window.location.origin // Optional: for certain CORS setups
        },
        // credentials: "include", // Usually not needed if sending token in header and CORS is permissive
        mode: "cors"
      });
      
      console.log("dashboard.js: Fetch response received. Status:", response.status); // DEBUG

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`dashboard.js: Failed to fetch user data. Status: ${response.status}, Response: ${errorText}`); // DEBUG
        throw new Error(`Failed to fetch user data. Status: ${response.status}`);
      }
      
      const userDataResponse = await response.json();
      console.log("dashboard.js: User data fetched successfully:", userDataResponse); // DEBUG
      
      // Update UI with user data
      updateUI(userDataResponse);
      
      // Store updated user data
      localStorage.setItem("userData", JSON.stringify(userDataResponse));
      
      return userDataResponse;
    } catch (error) {
      console.error("dashboard.js: Error in fetchUserData catch block:", error); // DEBUG
      showMessage("Error loading your account data. Please try again later.", "error");
      return null;
    }
  }
  
  // Update UI with user data
  function updateUI(userData) {
    // Update balance
    if (balanceElement && userData.balances) {
      const ubtBalance = userData.balances.ubt || 0;
      balanceElement.textContent = `${ubtBalance.toFixed(2)} UBT`;
    }
    
    // Update bots list
    if (botsList) { // Check if the botsList element exists
      botsList.innerHTML = ''; // Clear existing bots first
      if (userData.bots && Array.isArray(userData.bots) && userData.bots.length > 0) {
        // Add each bot
        userData.bots.forEach(bot => {
          const botItem = document.createElement('div');
          botItem.className = 'bot-item';
          
          botItem.innerHTML = `
            <div class="bot-header">
              <h3>${bot.name}</h3>
              <span class="bot-status ${bot.status.toLowerCase()}">${bot.status}</span>
            </div>
            <div class="bot-details">
              <div class="bot-stat">
                <span class="stat-label">Type:</span>
                <span class="stat-value">${bot.type}</span>
              </div>
              <div class="bot-stat">
                <span class="stat-label">Profit:</span>
                <span class="stat-value ${parseFloat(bot.profit) >= 0 ? 'positive' : 'negative'}">${bot.profit} UBT</span>
              </div>
              <div class="bot-stat">
                <span class="stat-label">Last Active:</span>
                <span class="stat-value">${formatDate(bot.lastActive)}</span>
              </div>
            </div>
            <div class="bot-actions">
              <button class="btn btn-small ${bot.status === 'Active' ? 'btn-danger' : 'btn-primary'}" data-bot-id="${bot.id}" data-action="${bot.status === 'Active' ? 'stop' : 'start'}">
                ${bot.status === 'Active' ? 'Stop Bot' : 'Start Bot'}
              </button>
              <button class="btn btn-small btn-secondary" data-bot-id="${bot.id}" data-action="settings">Settings</button>
            </div>
          `;
          
          botsList.appendChild(botItem);
        });
        
        // Add event listeners to bot action buttons
        const botButtons = document.querySelectorAll('.bot-actions button');
        botButtons.forEach(button => {
          button.addEventListener('click', handleBotAction);
        });
      } else {
        // Handle case where there are no bots or userData.bots is undefined/not an array
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-bots-message';
        emptyMessage.textContent = 'You don\'t have any bots yet. Purchase your first bot to get started!';
        botsList.appendChild(emptyMessage);
      }
    }
  }
  
  // Handle bot actions
  async function handleBotAction(e) {
    const botId = e.target.getAttribute('data-bot-id');
    const action = e.target.getAttribute('data-action');
    
    try {
      const response = await fetch(`${API_URL}/api/bots/${botId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
          'Origin': window.location.origin
        },
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} bot`);
      }
      
      showMessage(`Bot ${action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'updated'} successfully!`, 'success');
      
      // Refresh user data
      fetchUserData();
    } catch (error) {
      console.error(`Error ${action} bot:`, error);
      showMessage(`Error ${action === 'start' ? 'starting' : action === 'stop' ? 'stopping' : 'updating'} bot. Please try again later.`, 'error');
    }
  }
  
  // Format date
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  
  // Initialize
  fetchUserData();
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
