// Refactored Dashboard page script
// Uses centralized auth_utils.js for all user data and balance operations

import { requireAuth, fetchUserData, updateGlobalBalanceDisplay, initGlobalBalanceDisplay } from './auth_utils.js';

// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is logged in and redirect if not
  if (!requireAuth()) return;

  // Initialize global balance display
  await initGlobalBalanceDisplay();
  
  // Elements
  const welcomeMessage = document.getElementById('welcome-message');
  const balanceAmount = document.querySelector('.balance-amount');
  const dailySignInButton = document.getElementById('daily-sign-in');
  const referralLink = document.getElementById('referral-link');
  const copyReferralButton = document.getElementById('copy-referral');
  const referralCount = document.getElementById('referral-count');
  const referralBonus = document.getElementById('referral-bonus');
  
  // Update welcome message and user data
  async function updateUserInfo() {
    try {
      // Fetch user data from API
      const userData = await fetchUserData();
      
      if (!userData) {
        throw new Error('Failed to fetch user data');
      }
      
      // Update welcome message
      if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${userData.username || 'User'}!`;
      }
      
      // Update balance
      if (balanceAmount) {
        balanceAmount.textContent = `${userData.balances?.ubt?.toFixed(2) || '0.00'} UBT`;
      }
      
      // Update referral info
      if (referralLink) {
        const baseUrl = window.location.origin;
        referralLink.value = `${baseUrl}/?ref=${userData.username || ''}`;
      }
      
      if (referralCount) {
        referralCount.textContent = userData.referrals?.count || 0;
      }
      
      if (referralBonus) {
        referralBonus.textContent = userData.referrals?.bonus?.toFixed(2) || '0.00';
      }
      
      // Also update global balance
      updateGlobalBalanceDisplay();
      
      return userData;
    } catch (error) {
      console.error('Error updating user info:', error);
      showMessage('Error loading user data. Please refresh the page.', 'error');
      return null;
    }
  }
  
  // Handle daily sign-in
  async function handleDailySignIn() {
    if (!dailySignInButton) return;
    
    dailySignInButton.disabled = true;
    dailySignInButton.textContent = 'Processing...';
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/daily-signin`, {
        method: 'POST',
        headers: {
          'x-auth-token': token
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || 'Sign-in failed');
      }
      
      // Show success message
      showMessage(`Daily sign-in successful! You received ${data.reward} UBT.`, 'success');
      
      // Update user info
      await updateUserInfo();
      
      // Update button state
      dailySignInButton.textContent = 'Signed In Today';
      dailySignInButton.disabled = true;
      dailySignInButton.classList.add('signed-in');
      
    } catch (error) {
      console.error('Error processing daily sign-in:', error);
      showMessage(error.message, 'error');
      
      // Reset button state
      dailySignInButton.disabled = false;
      dailySignInButton.textContent = 'Daily Sign-In';
    }
  }
  
  // Check daily sign-in status
  async function checkDailySignInStatus() {
    if (!dailySignInButton) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/daily-signin/status`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.msg || 'Failed to check sign-in status');
      }
      
      // Update button state based on sign-in status
      if (data.signedInToday) {
        dailySignInButton.textContent = 'Signed In Today';
        dailySignInButton.disabled = true;
        dailySignInButton.classList.add('signed-in');
      } else {
        dailySignInButton.textContent = 'Daily Sign-In';
        dailySignInButton.disabled = false;
        dailySignInButton.classList.remove('signed-in');
      }
      
    } catch (error) {
      console.error('Error checking daily sign-in status:', error);
      // Don't show error message to user, just log it
    }
  }
  
  // Handle copy referral link
  function handleCopyReferral() {
    if (!referralLink || !copyReferralButton) return;
    
    referralLink.select();
    document.execCommand('copy');
    
    // Show success message
    showMessage('Referral link copied to clipboard!', 'success');
    
    // Update button text temporarily
    const originalText = copyReferralButton.textContent;
    copyReferralButton.textContent = 'Copied!';
    
    // Reset button text after 2 seconds
    setTimeout(() => {
      copyReferralButton.textContent = originalText;
    }, 2000);
  }
  
  // Add event listeners
  if (dailySignInButton) {
    dailySignInButton.addEventListener('click', handleDailySignIn);
  }
  
  if (copyReferralButton) {
    copyReferralButton.addEventListener('click', handleCopyReferral);
  }
  
  // Initialize
  async function initialize() {
    // Update user info
    await updateUserInfo();
    
    // Check daily sign-in status
    await checkDailySignInStatus();
  }
  
  initialize();
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
