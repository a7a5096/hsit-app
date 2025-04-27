/**
 * HSIT App - Daily Sign In Functionality
 * This script handles the daily sign-in feature for HSIT App users
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the daily sign-in functionality
    initDailySignIn();
});

/**
 * Initialize the daily sign-in functionality
 */
function initDailySignIn() {
    const dailySignInButton = document.getElementById('dailySignInButton');
    const signInText = document.getElementById('signInText');
    
    if (dailySignInButton) {
        // Check if user has already signed in today
        const lastSignIn = localStorage.getItem('lastSignIn');
        const today = new Date().toDateString();
        
        if (lastSignIn === today) {
            // User has already signed in today
            signInText.textContent = 'Already Signed In Today';
            dailySignInButton.classList.add('signed-in');
            dailySignInButton.style.opacity = '0.7';
        } else {
            // User has not signed in today
            signInText.textContent = 'Daily Sign In';
            dailySignInButton.classList.remove('signed-in');
            dailySignInButton.style.opacity = '1';
            
            // Add click event listener
            dailySignInButton.addEventListener('click', handleDailySignIn);
        }
    }
}

/**
 * Handle the daily sign-in process
 */
function handleDailySignIn(event) {
    event.preventDefault();
    
    const dailySignInButton = document.getElementById('dailySignInButton');
    const signInText = document.getElementById('signInText');
    const today = new Date().toDateString();
    
    // Get user email from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userEmail = urlParams.get('email');
    
    if (!userEmail) {
        showNotification('Error: User not properly authenticated. Please log in again.', 'error');
        return;
    }
    
    // Record sign-in in localStorage
    localStorage.setItem('lastSignIn', today);
    
    // Update consecutive days counter
    let consecutiveDays = parseInt(localStorage.getItem('consecutiveDays') || '0');
    const lastSignInDate = localStorage.getItem('lastSignInDate');
    
    // Check if this is a consecutive day
    if (lastSignInDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();
        
        if (lastSignInDate === yesterdayString) {
            consecutiveDays++;
        } else if (lastSignInDate !== today) {
            // Reset if not yesterday and not today (already checked above)
            consecutiveDays = 1;
        }
    } else {
        consecutiveDays = 1;
    }
    
    localStorage.setItem('consecutiveDays', consecutiveDays.toString());
    localStorage.setItem('lastSignInDate', today);
    
    // Calculate reward based on consecutive days
    let reward = 10; // Base reward
    
    if (consecutiveDays >= 30) {
        reward = 50; // 30+ consecutive days
    } else if (consecutiveDays >= 7) {
        reward = 25; // 7+ consecutive days
    } else if (consecutiveDays >= 3) {
        reward = 15; // 3+ consecutive days
    }
    
    // Update UI
    signInText.textContent = 'Already Signed In Today';
    dailySignInButton.classList.add('signed-in');
    dailySignInButton.style.opacity = '0.7';
    
    // Remove click event listener to prevent multiple sign-ins
    dailySignInButton.removeEventListener('click', handleDailySignIn);
    
    // Show success notification with reward
    showNotification(`Daily sign-in successful! You've earned ${reward} points. You've signed in for ${consecutiveDays} consecutive days!`, 'success');
    
    // Send sign-in data to server (mock implementation)
    sendSignInDataToServer(userEmail, reward, consecutiveDays);
}

/**
 * Send sign-in data to server (mock implementation)
 * In a real implementation, this would make an API call to your backend
 */
function sendSignInDataToServer(userEmail, reward, consecutiveDays) {
    console.log(`User ${userEmail} signed in and earned ${reward} points. Consecutive days: ${consecutiveDays}`);
    
    // In a real implementation, you would make an API call here
    // Example:
    /*
    fetch('/api/daily-signin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: userEmail,
            reward: reward,
            consecutiveDays: consecutiveDays,
            timestamp: new Date().toISOString()
        }),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
        showNotification('Error recording sign-in. Please try again later.', 'error');
    });
    */
}

/**
 * Show a notification to the user
 */
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('hsit-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'hsit-notification';
        document.body.appendChild(notification);
        
        // Add styles
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        notification.style.zIndex = '1000';
        notification.style.maxWidth = '300px';
        notification.style.transition = 'all 0.3s ease-in-out';
    }
    
    // Set type-specific styles
    if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#F44336';
        notification.style.color = 'white';
    } else {
        notification.style.backgroundColor = '#2196F3';
        notification.style.color = 'white';
    }
    
    // Set message
    notification.textContent = message;
    
    // Show notification
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Remove from DOM after fade out
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Add CSS for the daily sign-in button
const style = document.createElement('style');
style.textContent = `
    .signed-in {
        cursor: default !important;
    }
    
    #dailySignInButton {
        transition: all 0.3s ease;
    }
    
    #dailySignInButton:hover:not(.signed-in) {
        transform: scale(1.05);
    }
`;
document.head.appendChild(style);
