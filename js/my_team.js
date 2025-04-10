// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';


// Script to handle invitation system functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  // Get user data
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const username = localStorage.getItem('username');
  
  // Elements
  const inviteCodeDisplay = document.getElementById('inviteCode');
  const copyButton = document.querySelector('.btn-secondary');
  const generateButton = document.querySelector('.generate-code-btn');
  const teamTable = document.querySelector('.team-table tbody');
  const customCodeInput = document.createElement('input');
  const saveCustomCodeBtn = document.createElement('button');
  
  // Add custom code input
  customCodeInput.type = 'text';
  customCodeInput.id = 'customInviteCode';
  customCodeInput.className = 'custom-code-input';
  customCodeInput.placeholder = 'Enter custom invitation code';
  customCodeInput.maxLength = 20;
  
  saveCustomCodeBtn.className = 'btn btn-primary save-code-btn';
  saveCustomCodeBtn.textContent = 'Save Custom Code';
  
  // Add custom code elements to page
  if (inviteCodeDisplay && inviteCodeDisplay.parentNode) {
    const customCodeContainer = document.createElement('div');
    customCodeContainer.className = 'custom-code-container';
    customCodeContainer.innerHTML = '<p>Create a custom invitation code or use your username:</p>';
    customCodeContainer.appendChild(customCodeInput);
    customCodeContainer.appendChild(saveCustomCodeBtn);
    
    inviteCodeDisplay.parentNode.insertBefore(customCodeContainer, inviteCodeDisplay.nextSibling);
  }
  
  // Fetch invitation code and team data
  async function fetchInvitationData() {
    try {
      // Fetch invitation code
      const codeResponse = await fetch('${API_BASE_URL}/api/invitations', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!codeResponse.ok) {
        throw new Error('Failed to fetch invitation code');
      }
      
      const codeData = await codeResponse.json();
      
      // If no invitation code exists, set username as default
      if (!codeData.invitationCode && username) {
        await setUsernameAsDefaultCode();
        return fetchInvitationData(); // Refresh data after setting default
      }
      
      // Update invitation code display
      if (inviteCodeDisplay) {
        inviteCodeDisplay.textContent = codeData.invitationCode || username;
      }
      
      // Fetch team data
      const teamResponse = await fetch('${API_BASE_URL}/api/invitations/team', {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!teamResponse.ok) {
        throw new Error('Failed to fetch team data');
      }
      
      const teamData = await teamResponse.json();
      
      // Update team table
      updateTeamTable(teamData);
      
      return { code: codeData.invitationCode || username, team: teamData };
    } catch (error) {
      console.error('Error fetching invitation data:', error);
      showMessage('Error loading your invitation data. Please try again later.', 'error');
      
      // If error occurs, still display username as fallback
      if (inviteCodeDisplay && username) {
        inviteCodeDisplay.textContent = username;
      }
      
      return null;
    }
  }
  
  // Set username as default invitation code
  async function setUsernameAsDefaultCode() {
    if (!username) return;
    
    try {
      const response = await fetch('${API_BASE_URL}/api/invitations/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ invitationCode: username })
      });
      
      if (!response.ok) {
        throw new Error('Failed to set default invitation code');
      }
      
      showMessage('Your username has been set as your default invitation code', 'success');
      return true;
    } catch (error) {
      console.error('Error setting default code:', error);
      showMessage('Error setting default invitation code. Using username as fallback.', 'warning');
      return false;
    }
  }
  
  // Save custom invitation code
  async function saveCustomCode(customCode) {
    if (!customCode) return;
    
    try {
      const response = await fetch('${API_BASE_URL}/api/invitations/set-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ invitationCode: customCode })
      });
      
      if (!response.ok) {
        throw new Error('Failed to set custom invitation code');
      }
      
      const data = await response.json();
      
      // Update invitation code display
      if (inviteCodeDisplay) {
        inviteCodeDisplay.textContent = data.invitationCode;
      }
      
      showMessage('Custom invitation code saved successfully!', 'success');
      return true;
    } catch (error) {
      console.error('Error setting custom code:', error);
      showMessage('Error setting custom invitation code. Please try a different code.', 'error');
      return false;
    }
  }
  
  // Update team table with data
  function updateTeamTable(teamData) {
    if (!teamTable) return;
    
    // Clear existing rows
    teamTable.innerHTML = '';
    
    // Add direct invites
    if (teamData.directInvites && teamData.directInvites.length > 0) {
      teamData.directInvites.forEach(member => {
        addTeamMember(member, 'Direct');
      });
    }
    
    // Add second-level invites
    if (teamData.secondLevelInvites && teamData.secondLevelInvites.length > 0) {
      teamData.secondLevelInvites.forEach(member => {
        addTeamMember(member, 'Second-level');
      });
    }
    
    // If no team members, show message
    if (teamTable.children.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="4">No team members yet. Share your invitation code to grow your team!</td>';
      teamTable.appendChild(emptyRow);
    }
    
    // Update bonus info
    const bonusInfo = document.querySelector('.bonus-info');
    if (bonusInfo) {
      bonusInfo.innerHTML = `
        <h2>Your Bonuses</h2>
        <p><strong>Total UBT Bonus Earned:</strong> ${teamData.ubtBonusEarned || 0} UBT</p>
        <p><strong>Qualified Invites:</strong> ${teamData.qualifiedInvites || 0} / ${10} (needed for free 500 bot)</p>
      `;
    }
  }
  
  // Add team member to table
  function addTeamMember(member, level) {
    const row = document.createElement('tr');
    
    // Format date
    const joinDate = new Date(member.createdAt);
    const formattedDate = joinDate.toISOString().split('T')[0];
    
    // Determine status
    const status = member.isPhoneVerified ? 'Active' : 'Pending Activation';
    
    // Determine UBT bonus
    const ubtBonus = level === 'Direct' ? '10 UBT' : '15 UBT';
    
    row.innerHTML = `
      <td>${member.username}</td>
      <td>${formattedDate}</td>
      <td>${status}</td>
      <td>${member.botsPurchased && member.botsPurchased.length > 0 ? ubtBonus : '0 UBT'}</td>
    `;
    
    teamTable.appendChild(row);
  }
  
  // Copy invitation code to clipboard
  function copyInvitationCode() {
    if (!inviteCodeDisplay) return;
    
    const code = inviteCodeDisplay.textContent;
    
    // Create temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = code;
    document.body.appendChild(tempInput);
    
    // Select and copy
    tempInput.select();
    document.execCommand('copy');
    
    // Remove temporary element
    document.body.removeChild(tempInput);
    
    // Show success message
    showMessage('Invitation code copied to clipboard!', 'success');
  }
  
  // Create shareable link
  function createShareableLink() {
    if (!inviteCodeDisplay) return;
    
    const code = inviteCodeDisplay.textContent;
    const baseUrl = window.location.origin;
    return `${baseUrl}/signup.html?invite=${code}`;
  }
  
  // Add event listeners
  if (copyButton) {
    copyButton.addEventListener('click', function(e) {
      e.preventDefault();
      copyInvitationCode();
    });
  }
  
  // Remove generate button as we're using username as default
  if (generateButton) {
    generateButton.parentNode.removeChild(generateButton);
  }
  
  // Add event listener for custom code button
  saveCustomCodeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    const customCode = customCodeInput.value.trim();
    
    if (!customCode) {
      showMessage('Please enter a custom invitation code', 'error');
      return;
    }
    
    saveCustomCode(customCode);
  });
  
  // Add share button
  const shareButton = document.createElement('button');
  shareButton.className = 'btn btn-primary share-code-btn';
  shareButton.textContent = 'Share Invitation Link';
  
  // Add after custom code section
  if (saveCustomCodeBtn.parentNode) {
    saveCustomCodeBtn.parentNode.parentNode.appendChild(shareButton);
  }
  
  // Add share button event listener
  shareButton.addEventListener('click', function(e) {
    e.preventDefault();
    
    const shareLink = createShareableLink();
    
    // Create share modal
    const modalHTML = `
      <div class="modal" id="shareModal">
        <div class="modal-content">
          <h2>Share Your Invitation</h2>
          <p>Share this link with friends to invite them to join:</p>
          <div class="form-group">
            <input type="text" id="shareLink" value="${shareLink}" readonly>
            <button class="btn btn-secondary" id="copyShareLink">Copy</button>
          </div>
          <p class="info-text">When they sign up using your link, you'll earn UBT bonuses when they purchase bots!</p>
          <button class="btn btn-secondary" id="closeShareModal">Close</button>
        </div>
      </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('shareModal');
    const copyLinkBtn = document.getElementById('copyShareLink');
    const closeBtn = document.getElementById('closeShareModal');
    const linkInput = document.getElementById('shareLink');
    
    // Show modal
    modal.style.display = 'flex';
    
    // Copy link button
    copyLinkBtn.addEventListener('click', function() {
      linkInput.select();
      document.execCommand('copy');
      this.textContent = 'Copied!';
      setTimeout(() => { this.textContent = 'Copy'; }, 2000);
    });
    
    // Close button
    closeBtn.addEventListener('click', function() {
      modal.remove();
    });
  });
  
  // Add bonus info section
  const infoSection = document.createElement('div');
  infoSection.className = 'content-section card-style bonus-info';
  infoSection.innerHTML = `
    <h2>Your Bonuses</h2>
    <p><strong>Total UBT Bonus Earned:</strong> Loading...</p>
    <p><strong>Qualified Invites:</strong> Loading...</p>
  `;
  
  // Add before team section
  const teamSection = document.querySelector('.content-section.card-style:nth-child(2)');
  if (teamSection) {
    teamSection.parentNode.insertBefore(infoSection, teamSection);
  }
  
  // Initialize
  fetchInvitationData();
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
