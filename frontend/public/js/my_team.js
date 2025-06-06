// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com'; // Use const and ensure consistency

// Initialize Eruda if it exists
if (typeof eruda !== 'undefined') {
  eruda.init();
} else {
  // Create a dummy eruda object to prevent errors
  window.eruda = {
    init: function() {
      console.log('Eruda debugging disabled in production');
      return true;
    }
  };
}

// Track authentication state
let authCheckInProgress = false;
let lastAuthCheck = 0;
const AUTH_CHECK_INTERVAL = 60000; // 1 minute

// Script to handle invitation system functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log("My Team page loaded, checking authentication...");
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    console.log("No token found, redirecting to login.");
    window.location.href = 'index.html'; // Use index.html for login
    return;
  }

  // Get cached user data first to avoid blank screen
  let cachedUserData = null;
  try {
    cachedUserData = JSON.parse(localStorage.getItem('userData') || '{}');
  } catch (e) {
    console.error("Error parsing cached user data:", e);
    // Continue with null cachedUserData
  }

  // If we have cached data with a username, initialize the page immediately
  if (cachedUserData && cachedUserData.username) {
    console.log("Using cached user data for initial render");
    initializeTeamPage(cachedUserData, token);
  } else {
    console.log("No valid cached user data found");
    // Show loading state if no cached data
    showLoadingState();
  }

  // Always fetch fresh user data from the server
  validateAndRefreshUserData(token)
    .then(userData => {
      if (userData && userData.username) {
        // Update the page with fresh userData
        initializeTeamPage(userData, token);
      } else {
        console.warn("User data validation failed but not forcing logout");
        showMessage("Could not verify your account. Some features may be limited.", "warning");
      }
    })
    .catch(error => {
      console.error("Error during user data fetch:", error);
      
      // Don't log out immediately for network errors
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        showMessage("Network error. Using cached data. Please check your connection.", "warning");
      } else if (error.status === 401) {
        // Only for actual authentication errors, show login prompt
        showLoginPrompt("Your session has expired. Please log in again.");
      } else {
        // For other errors, just show a warning
        showMessage("Error loading user data. Some features may be limited.", "warning");
      }
    });
});

// Show loading state while waiting for data
function showLoadingState() {
  const inviteCodeDisplay = document.getElementById('inviteCode');
  if (inviteCodeDisplay) {
    inviteCodeDisplay.textContent = 'Loading...';
  }
  
  const teamTable = document.querySelector('.team-table tbody');
  if (teamTable) {
    teamTable.innerHTML = '<tr><td colspan="4">Loading team members...</td></tr>';
  }
}

// Show login prompt instead of automatic logout
function showLoginPrompt(message) {
  // Create modal if it doesn't exist
  let loginModal = document.getElementById('loginPromptModal');
  if (!loginModal) {
    const modalHTML = `
      <div class="modal" id="loginPromptModal" style="display: flex;">
        <div class="modal-content">
          <h2>Session Expired</h2>
          <p>${message}</p>
          <div class="form-group" style="display: flex; justify-content: space-between; margin-top: 20px;">
            <button class="btn btn-secondary" id="stayOnPageBtn">Stay on Page</button>
            <button class="btn btn-primary" id="loginAgainBtn">Log In Again</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    document.getElementById('stayOnPageBtn').addEventListener('click', function() {
      document.getElementById('loginPromptModal').remove();
    });
    
    document.getElementById('loginAgainBtn').addEventListener('click', function() {
      logout();
    });
  } else {
    loginModal.style.display = 'flex';
  }
}

// Helper function to validate and refresh user data
async function validateAndRefreshUserData(token) {
  // Prevent multiple simultaneous auth checks
  if (authCheckInProgress) {
    console.log("Auth check already in progress, skipping");
    return JSON.parse(localStorage.getItem('userData') || '{}');
  }
  
  // Check if we've checked auth recently
  const now = Date.now();
  if (now - lastAuthCheck < AUTH_CHECK_INTERVAL) {
    console.log("Using recent auth check result");
    return JSON.parse(localStorage.getItem('userData') || '{}');
  }
  
  authCheckInProgress = true;
  
  try {
    console.log("Fetching fresh user data from server");
    const response = await fetch(`${API_URL}/api/auth`, {
      headers: {
        'x-auth-token': token,
        'Origin': window.location.origin
      },
      credentials: 'include',
      mode: 'cors'
    });
    
    // Update last check time
    lastAuthCheck = Date.now();
    
    if (!response.ok) {
      const error = new Error(`Failed to fetch user data (Status: ${response.status})`);
      error.status = response.status;
      throw error;
    }
    
    const freshUserData = await response.json();
    
    // Validate the user data has required fields
    if (!freshUserData || !freshUserData.user || !freshUserData.user.username) {
      throw new Error('Invalid user data received from server');
    }
    
    // Update local storage with user data
    localStorage.setItem('userData', JSON.stringify(freshUserData.user));
    return freshUserData.user;
  } catch (error) {
    console.error('Error validating user data:', error);
    throw error;
  } finally {
    authCheckInProgress = false;
  }
}

// Function to initialize the My Team page elements and data
function initializeTeamPage(userData, token) {
  try {
    console.log("Initializing team page with user data");
    const inviteCodeDisplay = document.getElementById('inviteCode');
    const copyButton = document.querySelector('.invite-code-display .btn-secondary'); // More specific selector
    const teamTable = document.querySelector('.team-table tbody');
    
    // Ensure bonus info section exists
    const bonusInfoSection = ensureBonusInfoSection();

    // --- Use username as the referral code --- 
    const referralCode = userData.username;
    if (inviteCodeDisplay) {
      inviteCodeDisplay.textContent = referralCode;
    } else {
      console.error("Invite code display element not found.");
    }
    
    // --- Removed Generate New Code Button from HTML ---

    // Fetch team data using the token
    fetchTeamData(token, bonusInfoSection, teamTable);

    // Add event listener for Copy button
    if (copyButton && inviteCodeDisplay) {
      copyButton.addEventListener('click', function(e) {
        e.preventDefault();
        copyToClipboard(referralCode, 'Referral code');
      });
    } else {
      console.error("Copy button or invite code display not found for event listener.");
    }

    // Add Share button functionality
    const shareButton = document.querySelector('.share-code-btn');
    if (shareButton) {
        shareButton.addEventListener('click', function(e) {
            e.preventDefault();
            const shareLink = createShareableLink(referralCode);
            showShareModal(shareLink);
        });
    }
  } catch (error) {
    console.error("Error initializing team page:", error);
    showMessage("Error initializing page. Please refresh and try again.", "error");
  }
}

// Fetch team data (direct invites, second-level, bonuses)
async function fetchTeamData(token, bonusInfoSection, teamTable) {
  if (!teamTable) {
    console.error("Team table not found.");
    return;
  }

  // Show loading state
  teamTable.innerHTML = '<tr><td colspan="4">Loading team members...</td></tr>';
  if (bonusInfoSection) {
    bonusInfoSection.innerHTML = `<h2>Your Bonuses</h2><p>Loading bonus information...</p>`;
  }

  try {
    // Fetch team data (assuming one endpoint provides all necessary info)
    const teamResponse = await fetch(`${API_URL}/api/team/data`, { // Adjusted API endpoint assumption
      headers: {
        'x-auth-token': token,
        'Origin': window.location.origin
      },
      credentials: 'include',
      mode: 'cors'
    });

    if (!teamResponse.ok) {
      // For 401 errors, show login prompt instead of error
      if (teamResponse.status === 401) {
        showLoginPrompt("Your session has expired. Please log in again.");
        return;
      }
      
      const errorData = await teamResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch team data (Status: ${teamResponse.status})`);
    }

    const teamData = await teamResponse.json();
    console.log("Team Data Received:", teamData);

    // Update team table
    updateTeamTable(teamData, teamTable);

    // Update bonus info section
    updateBonusInfo(teamData, bonusInfoSection);

  } catch (error) {
    console.error('Error fetching team data:', error);
    
    // Don't show error for network issues if we're offline
    if (navigator.onLine === false) {
      showMessage("You appear to be offline. Team data couldn't be loaded.", "warning");
    } else {
      showMessage(`Error loading your team data: ${error.message}. Please try again later.`, 'error');
    }
    
    // Display error state in table and bonus section
    teamTable.innerHTML = '<tr><td colspan="4">Error loading team members. Please refresh to try again.</td></tr>';
    if (bonusInfoSection) {
      bonusInfoSection.innerHTML = `<h2>Your Bonuses</h2><p>Error loading bonus information. Please refresh to try again.</p>`;
    }
  }
}

// Update team table with data
function updateTeamTable(teamData, teamTable) {
  if (!teamTable) return;
  
  // Clear existing rows
  teamTable.innerHTML = '';
  
  let membersFound = false;

  // Add direct invites
  if (teamData.directInvites && Array.isArray(teamData.directInvites) && teamData.directInvites.length > 0) {
    membersFound = true;
    teamData.directInvites.forEach(member => {
      addTeamMember(member, 'Direct', teamTable);
    });
  }
  
  // Add second-level invites
  if (teamData.secondLevelInvites && Array.isArray(teamData.secondLevelInvites) && teamData.secondLevelInvites.length > 0) {
    membersFound = true;
    teamData.secondLevelInvites.forEach(member => {
      addTeamMember(member, 'Second-level', teamTable);
    });
  }
  
  // If no team members, show message
  if (!membersFound) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="4">No team members yet. Share your referral code to grow your team!</td>';
    teamTable.appendChild(emptyRow);
  }
}

// Update bonus info section
function updateBonusInfo(teamData, bonusInfoSection) {
  if (!bonusInfoSection) return;

  // Safely access data with defaults
  const totalBonus = (teamData && typeof teamData.ubtBonusEarned === 'number') ? teamData.ubtBonusEarned : 0;
  const qualifiedInvites = (teamData && typeof teamData.qualifiedInvites === 'number') ? teamData.qualifiedInvites : 0;
  const neededForBot = 10; // Requirement for the free bot

  bonusInfoSection.innerHTML = `
    <h2>Your Bonuses</h2>
    <p><strong>Total UBT Bonus Earned:</strong> ${totalBonus.toFixed(2)} UBT</p>
    <p><strong>Qualified Invites:</strong> ${qualifiedInvites} / ${neededForBot} (needed for free 500 bot)</p>
  `;
}

// Add team member to table
function addTeamMember(member, level, teamTable) {
  if (!member || !teamTable) return;
  
  const row = document.createElement('tr');
  
  // Format date
  let formattedDate = 'N/A';
  try {
    if (member.createdAt) {
      const joinDate = new Date(member.createdAt);
      formattedDate = joinDate.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error("Error formatting date:", e);
  }
  
  // Determine status (adjust based on actual user data fields)
  const status = member.isActive ? 'Active' : (member.isVerified ? 'Verified' : 'Pending'); 
  
  // Determine UBT bonus earned from this member (needs backend logic)
  // This frontend display might be simplified or rely on aggregated data
  const ubtBonusEarned = typeof member.bonusEarned === 'number' ? member.bonusEarned : 0; // Example field
  
  row.innerHTML = `
    <td>${member.username || 'N/A'} (${level})</td>
    <td>${formattedDate}</td>
    <td>${status}</td>
    <td>${ubtBonusEarned.toFixed(2)} UBT</td>
  `;
  
  teamTable.appendChild(row);
}

// Create shareable link
function createShareableLink(referralCode) {
  const baseUrl = window.location.origin;
  // Ensure the signup page correctly handles the 'invite' query parameter
  return `${baseUrl}/signup.html?invite=${encodeURIComponent(referralCode)}`;
}

// Show Share Modal
function showShareModal(shareLink) {
  try {
    // Remove existing modal first if any
    const existingModal = document.getElementById('shareModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div class="modal" id="shareModal" style="display: flex;">
        <div class="modal-content">
          <span class="close-modal-btn" id="closeShareModal">&times;</span>
          <h2>Share Your Referral Link</h2>
          <p>Share this link with friends to invite them:</p>
          <div class="form-group" style="display: flex; align-items: center;">
            <input type="text" id="shareLinkInput" value="${shareLink}" readonly style="flex-grow: 1; margin-right: 10px;">
            <button class="btn btn-secondary" id="copyShareLink">Copy</button>
          </div>
          <p class="info-text">Earn UBT bonuses when they sign up and purchase bots!</p>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('shareModal');
    const copyLinkBtn = document.getElementById('copyShareLink');
    const closeBtn = document.getElementById('closeShareModal');
    const linkInput = document.getElementById('shareLinkInput');
    
    // Copy link button
    copyLinkBtn.addEventListener('click', function() {
      copyToClipboard(linkInput.value, 'Link');
      this.textContent = 'Copied!';
      setTimeout(() => { this.textContent = 'Copy'; }, 2000);
    });
    
    // Close button
    closeBtn.addEventListener('click', function() {
      modal.remove();
    });

    // Close modal if clicking outside the content
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        modal.remove();
      }
    });
  } catch (error) {
    console.error("Error showing share modal:", error);
    showMessage("Error showing share options. Please try again.", "error");
  }
}

// Generic Copy to Clipboard function
function copyToClipboard(text, itemType = 'Text') {
  try {
    navigator.clipboard.writeText(text).then(() => {
      showMessage(`${itemType} copied to clipboard!`, 'success');
    }).catch(err => {
      console.error(`Failed to copy ${itemType}:`, err);
      // Fallback for older browsers/http
      try {
        const tempInput = document.createElement('textarea'); // Use textarea for potentially long links
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showMessage(`${itemType} copied to clipboard!`, 'success');
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        showMessage(`Failed to copy ${itemType}. Please copy it manually.`, 'error');
      }
    });
  } catch (error) {
    console.error("Error in copy to clipboard:", error);
    showMessage(`Failed to copy ${itemType}. Please try again.`, 'error');
  }
}

// Show message function (ensure it's robust)
function showMessage(message, type = 'info') {
  try {
    let statusElement = document.getElementById('statusMessage');
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'statusMessage';
      // Prepend to body or a specific container
      document.body.prepend(statusElement);
    }
    
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`; // Use template literal
    statusElement.style.display = 'block';
    
    // Clear previous timeouts if any
    if (statusElement.timeoutId) {
      clearTimeout(statusElement.timeoutId);
    }

    // Hide after 5 seconds
    statusElement.timeoutId = setTimeout(() => {
      statusElement.style.display = 'none';
      statusElement.timeoutId = null; // Clear the timeout ID
    }, 5000);
  } catch (error) {
    console.error("Error showing message:", error);
  }
}

// Logout function (ensure it's available)
function logout() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
  } catch (error) {
    console.error("Error during logout:", error);
    // Force redirect even if cleanup fails
    window.location.href = 'index.html';
  }
}

// Add bonus info section dynamically if not present in HTML
function ensureBonusInfoSection() {
  try {
    let bonusSection = document.querySelector('.bonus-info');
    if (!bonusSection) {
      bonusSection = document.createElement('section');
      bonusSection.className = 'content-section card-style bonus-info';
      bonusSection.innerHTML = `<h2>Your Bonuses</h2><p>Loading...</p>`;
      // Insert it before the team table section
      const teamSection = document.querySelector('.team-table-container')?.closest('.content-section');
      if (teamSection) {
        teamSection.parentNode.insertBefore(bonusSection, teamSection);
      } else {
        // Fallback: append to main
        document.querySelector('.page-main')?.appendChild(bonusSection);
      }
    }
    return bonusSection;
  } catch (error) {
    console.error("Error ensuring bonus info section:", error);
    return null;
  }
}

// Check connection status
window.addEventListener('online', function() {
  showMessage('You are back online. Refreshing data...', 'success');
  // Refresh user data when connection is restored
  const token = localStorage.getItem('token');
  if (token) {
    validateAndRefreshUserData(token)
      .then(userData => {
        if (userData && userData.username) {
          initializeTeamPage(userData, token);
        }
      })
      .catch(error => {
        console.error("Error refreshing data after reconnection:", error);
      });
  }
});

window.addEventListener('offline', function() {
  showMessage('You are offline. Some features may be limited.', 'warning');
});

// Global error handler
window.addEventListener('error', function(event) {
  console.error('Global error caught:', event.error);
  showMessage('An error occurred. Please refresh the page and try again.', 'error');
  // Prevent the page from crashing or logging out automatically
  event.preventDefault();
});
