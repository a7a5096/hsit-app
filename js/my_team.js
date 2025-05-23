// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com'; // Use const and ensure consistency

// Script to handle invitation system functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    console.log("No token found, redirecting to login.");
    window.location.href = 'index.html'; // Use index.html for login
    return;
  }

  // Debug: Log token presence to help diagnose issues
  console.log("Token found in localStorage:", !!token);

  // Get user data from localStorage
  let userData = null;
  try {
      userData = JSON.parse(localStorage.getItem('userData') || '{}');
      // Debug: Log userData to help diagnose issues
      console.log("userData from localStorage:", userData ? "Found" : "Not found");
  } catch (e) {
      console.error("Error parsing user data from localStorage:", e);
      // Handle error, maybe redirect to login or show error message
      logout(); // Log out if user data is corrupted
      return;
  }
  
  // Ensure username exists in userData
  if (!userData || !userData.username) {
      console.error("Username not found in userData. Fetching fresh data.");
      // Attempt to fetch fresh user data if username is missing
      fetchFreshUserData(token).then(freshData => {
          if (freshData && freshData.username) {
              userData = freshData; // Update userData
              initializeTeamPage(userData, token);
          } else {
              console.error("Failed to fetch user data or username still missing. Logging out.");
              logout(); // Log out if user data cannot be retrieved
          }
      });
  } else {
      // Initialize the page with existing userData
      initializeTeamPage(userData, token);
  }
});

// Helper function to fetch fresh user data
async function fetchFreshUserData(token) {
    try {
        // Debug: Log the request being made
        console.log("Fetching fresh user data from:", `${API_URL}/api/auth`);
        console.log("Using token:", token.substring(0, 10) + "...");

        // FIXED: Ensure headers are properly set and CORS issues are addressed
        const headers = new Headers();
        headers.append('x-auth-token', token);
        headers.append('Content-Type', 'application/json');
        headers.append('Origin', window.location.origin);

        const response = await fetch(`${API_URL}/api/auth`, {
            method: 'GET',
            headers: headers,
            credentials: 'include',
            mode: 'cors',
            cache: 'no-cache' // Prevent caching issues
        });

        // Debug: Log response status
        console.log("Auth API response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Auth API error response:", errorText);
            throw new Error(`Failed to fetch user data: ${response.status} ${errorText}`);
        }
        
        const freshUserData = await response.json();
        console.log("Fresh user data received:", freshUserData);
        
        // Update local storage
        localStorage.setItem('userData', JSON.stringify(freshUserData)); 
        return freshUserData;
    } catch (error) {
        console.error('Error fetching fresh user data:', error);
        return null;
    }
}

// Function to initialize the My Team page elements and data
function initializeTeamPage(userData, token) {
    const inviteCodeDisplay = document.getElementById('inviteCode');
    const copyButton = document.querySelector('.invite-code-display .btn-secondary'); // More specific selector
    const teamTable = document.querySelector('.team-table tbody');
    const bonusInfoSection = document.querySelector('.bonus-info'); // Select bonus info section

    // --- Modification: Use username as the referral code --- 
    const referralCode = userData.username;
    if (inviteCodeDisplay) {
        inviteCodeDisplay.textContent = referralCode;
    } else {
        console.error("Invite code display element not found.");
    }
    // --- End Modification --- 

    // --- Modification: Remove Generate/Custom Code Button Logic --- 
    const generateButton = document.querySelector('.generate-code-btn');
    if (generateButton) {
        generateButton.remove(); // Remove the button from the DOM
    }
    // Remove any dynamically added custom code elements if they existed previously
    const customCodeContainer = document.querySelector('.custom-code-container');
    if (customCodeContainer) {
        customCodeContainer.remove();
    }
    // --- End Modification --- 

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
    setupShareButton(referralCode);
}

// Fetch team data (direct invites, second-level, bonuses)
async function fetchTeamData(token, bonusInfoSection, teamTable) {
    if (!teamTable || !bonusInfoSection) {
        console.error("Team table or bonus info section not found.");
        return;
    }

    try {
        // Debug: Log the request being made
        console.log("Fetching team data from:", `${API_URL}/api/team/data`);
        
        // FIXED: Ensure headers are properly set and CORS issues are addressed
        const headers = new Headers();
        headers.append('x-auth-token', token);
        headers.append('Content-Type', 'application/json');
        headers.append('Origin', window.location.origin);

        // Fetch team data (assuming one endpoint provides all necessary info)
        const teamResponse = await fetch(`${API_URL}/api/team/data`, {
            method: 'GET',
            headers: headers,
            credentials: 'include',
            mode: 'cors',
            cache: 'no-cache' // Prevent caching issues
        });

        // Debug: Log response status
        console.log("Team API response status:", teamResponse.status);

        if (!teamResponse.ok) {
            const errorText = await teamResponse.text();
            console.error("Team API error response:", errorText);
            throw new Error(`Failed to fetch team data: ${teamResponse.status} ${errorText}`);
        }

        const teamData = await teamResponse.json();
        console.log("Team Data Received:", teamData);

        // Update team table
        updateTeamTable(teamData, teamTable);

        // Update bonus info section
        updateBonusInfo(teamData, bonusInfoSection);

    } catch (error) {
        console.error('Error fetching team data:', error);
        showMessage(`Error loading your team data: ${error.message}. Please try again later.`, 'error');
        // Display error state in table and bonus section
        teamTable.innerHTML = '<tr><td colspan="4">Error loading team members.</td></tr>';
        if (bonusInfoSection) {
             bonusInfoSection.innerHTML = `<h2>Your Bonuses</h2><p>Error loading bonus information.</p>`;
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
    if (teamData.directInvites && teamData.directInvites.length > 0) {
        membersFound = true;
        teamData.directInvites.forEach(member => {
            addTeamMember(member, 'Direct', teamTable);
        });
    }
    
    // Add second-level invites
    if (teamData.secondLevelInvites && teamData.secondLevelInvites.length > 0) {
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

    // Assuming teamData contains fields like ubtBonusEarned and qualifiedInvites
    const totalBonus = teamData.ubtBonusEarned || 0;
    const qualifiedInvites = teamData.qualifiedInvites || 0;
    const neededForBot = 10; // Requirement for the free bot

    bonusInfoSection.innerHTML = `
        <h2>Your Bonuses</h2>
        <p><strong>Total UBT Bonus Earned:</strong> ${totalBonus.toFixed(2)} UBT</p>
        <p><strong>Qualified Invites:</strong> ${qualifiedInvites} / ${neededForBot} (needed for free 500 bot)</p>
      `;
}

// Add team member to table
function addTeamMember(member, level, teamTable) {
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
    const ubtBonusEarned = member.bonusEarned || 0; // Example field
    
    row.innerHTML = `
      <td>${member.username || 'N/A'} (${level})</td>
      <td>${formattedDate}</td>
      <td>${status}</td>
      <td>${ubtBonusEarned.toFixed(2)} UBT</td>
    `;
    
    teamTable.appendChild(row);
}

// Setup Share Button
function setupShareButton(referralCode) {
    const section = document.querySelector('.content-section.card-style'); // First section
    if (!section) return;

    // Check if share button already exists
    if (section.querySelector('.share-code-btn')) return;

    const shareButton = document.createElement('button');
    shareButton.className = 'btn btn-primary share-code-btn';
    shareButton.textContent = 'Share Referral Link';
    shareButton.style.marginTop = '10px'; // Add some spacing

    // Add after the invite code display container
    const inviteCodeContainer = document.querySelector('.invite-code-display');
    if (inviteCodeContainer && inviteCodeContainer.parentNode) {
         inviteCodeContainer.parentNode.insertBefore(shareButton, inviteCodeContainer.nextSibling);
    }

    // Add share button event listener
    shareButton.addEventListener('click', function(e) {
        e.preventDefault();
        const shareLink = createShareableLink(referralCode);
        showShareModal(shareLink);
    });
}

// Create shareable link
function createShareableLink(referralCode) {
    const baseUrl = window.location.origin;
    // Ensure the signup page correctly handles the 'invite' query parameter
    return `${baseUrl}/signup.html?invite=${encodeURIComponent(referralCode)}`;
}

// Show Share Modal
function showShareModal(shareLink) {
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
}

// Generic Copy to Clipboard function
function copyToClipboard(text, itemType = 'Text') {
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
}

// Show message function (ensure it's robust)
function showMessage(message, type = 'info') {
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
}

// Logout function (ensure it's available)
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
}

// Add bonus info section dynamically if not present in HTML
function ensureBonusInfoSection() {
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
}

// FIXED: Add a function to check if token is valid and refresh if needed
async function checkAndRefreshToken() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        // Make a lightweight request to verify token
        const response = await fetch(`${API_URL}/api/auth`, {
            method: 'HEAD',
            headers: {
                'x-auth-token': token
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error checking token validity:', error);
        return false;
    }
}

// Ensure the bonus section exists when initializing
document.addEventListener('DOMContentLoaded', ensureBonusInfoSection);

// FIXED: Add token validation on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAndRefreshToken().then(isValid => {
        if (!isValid) {
            console.warn('Token validation failed, redirecting to login');
            logout();
        }
    });
});
