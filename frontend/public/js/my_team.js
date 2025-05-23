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

// Script to handle invitation system functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    console.log("No token found, redirecting to login.");
    window.location.href = 'index.html'; // Use index.html for login
    return;
  }

  // Always fetch fresh user data from the server
  fetchFreshUserData(token)
    .then(userData => {
      if (userData && userData.username) {
        // Initialize the page with fresh userData
        initializeTeamPage(userData, token);
      } else {
        console.error("Failed to fetch user data or username missing. Logging out.");
        logout(); // Log out if user data cannot be retrieved
      }
    })
    .catch(error => {
      console.error("Error during user data fetch:", error);
      showMessage("Error loading user data. Please try again later.", "error");
      logout();
    });
});

// Helper function to fetch fresh user data
async function fetchFreshUserData(token) {
    try {
        const response = await fetch(`${API_URL}/api/auth`, { // Assuming /api/auth returns user data
            headers: {
                'x-auth-token': token,
                'Origin': window.location.origin
            },
            credentials: 'include',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user data (Status: ${response.status})`);
        }
        
        const freshUserData = await response.json();
        
        // Validate the user data has required fields
        if (!freshUserData || !freshUserData.username) {
            throw new Error('Invalid user data received from server');
        }
        
        // Update local storage
        localStorage.setItem('userData', JSON.stringify(freshUserData)); 
        return freshUserData;
    } catch (error) {
        console.error('Error fetching fresh user data:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('userData');
        return null;
    }
}

// Function to initialize the My Team page elements and data
function initializeTeamPage(userData, token) {
    try {
        const inviteCodeDisplay = document.getElementById('inviteCode');
        const copyButton = document.querySelector('.invite-code-display .btn-secondary'); // More specific selector
        const teamTable = document.querySelector('.team-table tbody');
        
        // Ensure bonus info section exists
        const bonusInfoSection = ensureBonusInfoSection();

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
        showMessage(`Error loading your team data: ${error.message}. Please try again later.`, 'error');
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

// Setup Share Button
function setupShareButton(referralCode) {
    try {
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
    } catch (error) {
        console.error("Error setting up share button:", error);
    }
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

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    showMessage('An error occurred. Please refresh the page and try again.', 'error');
    // Prevent the page from crashing or logging out automatically
    event.preventDefault();
});
