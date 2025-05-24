// Refactored My Team page script
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
  const teamMembersList = document.getElementById('team-members-list');
  const teamStatsElement = document.getElementById('team-stats');
  const noTeamMessage = document.getElementById('no-team-message');
  
  // Fetch team data
  async function fetchTeamData() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/team`, {
        headers: {
          'x-auth-token': token
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch team data');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching team data:', error);
      showMessage('Error loading team data. Please try again later.', 'error');
      return null;
    }
  }
  
  // Update team UI
  function updateTeamUI(teamData) {
    if (!teamData || !teamMembersList) return;
    
    const { members, stats } = teamData;
    
    // Update team members list
    if (members && members.length > 0) {
      // Hide no team message
      if (noTeamMessage) {
        noTeamMessage.style.display = 'none';
      }
      
      // Clear existing list
      teamMembersList.innerHTML = '';
      
      // Add each member to the list
      members.forEach((member, index) => {
        const memberItem = document.createElement('li');
        memberItem.className = 'team-member';
        
        // Calculate member stats
        const joinDate = new Date(member.joinDate);
        const formattedDate = joinDate.toLocaleDateString();
        const daysActive = Math.ceil((new Date() - joinDate) / (1000 * 60 * 60 * 24));
        
        memberItem.innerHTML = `
          <div class="member-rank">${index + 1}</div>
          <div class="member-info">
            <div class="member-name">${member.username}</div>
            <div class="member-details">
              <span>Joined: ${formattedDate}</span>
              <span>Days active: ${daysActive}</span>
              <span>Bots purchased: ${member.botsPurchased || 0}</span>
            </div>
          </div>
          <div class="member-contribution">
            <div class="contribution-amount">${member.contribution.toFixed(2)} UBT</div>
            <div class="contribution-label">Team contribution</div>
          </div>
        `;
        
        teamMembersList.appendChild(memberItem);
      });
    } else {
      // Show no team message
      if (noTeamMessage) {
        noTeamMessage.style.display = 'block';
      }
      
      // Clear team members list
      teamMembersList.innerHTML = '';
    }
    
    // Update team stats
    if (stats && teamStatsElement) {
      teamStatsElement.innerHTML = `
        <div class="stat-item">
          <div class="stat-value">${stats.totalMembers}</div>
          <div class="stat-label">Team Members</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.totalBots}</div>
          <div class="stat-label">Total Bots</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.totalContribution.toFixed(2)} UBT</div>
          <div class="stat-label">Total Contribution</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.teamBonus.toFixed(2)} UBT</div>
          <div class="stat-label">Your Team Bonus</div>
        </div>
      `;
    }
  }
  
  // Initialize
  async function initialize() {
    // Fetch team data
    const teamData = await fetchTeamData();
    
    // Update team UI
    if (teamData) {
      updateTeamUI(teamData);
    }
    
    // Update user data and balance display
    await updateGlobalBalanceDisplay();
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
