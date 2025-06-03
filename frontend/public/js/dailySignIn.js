// Updated frontend code to ensure reward is always sent as a number
document.addEventListener('DOMContentLoaded', function() {
    initializeDailySignIn();
});

/**
 * Initialize the daily sign-in functionality
 */
function initializeDailySignIn() {
    // Check if we're on a page that should have the daily sign-in button
    const dailySignInContainer = document.getElementById('dailySignInContainer');
    if (!dailySignInContainer) return;
    
    // Create and append the daily sign-in button
    const dailySignInButton = document.createElement('button');
    dailySignInButton.id = 'dailySignInButton';
    dailySignInButton.className = 'btn btn-primary';
    dailySignInButton.innerHTML = '<i class="fas fa-calendar-check"></i> Daily Sign In';
    dailySignInButton.style.marginTop = '20px';
    dailySignInContainer.appendChild(dailySignInButton);
    
    // Add event listener to the button
    dailySignInButton.addEventListener('click', handleDailySignIn);
    
    // Check if user has already signed in today
    checkDailySignInStatus();
}

/**
 * Handle the daily sign-in button click
 */
async function handleDailySignIn() {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please log in to use the daily sign-in feature.', 'error');
        return;
    }
    
    try {
        // Disable button during processing
        const dailySignInButton = document.getElementById('dailySignInButton');
        dailySignInButton.disabled = true;
        dailySignInButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        // Calculate reward (between 0.5 and 1.5 UBT)
        // IMPORTANT: Ensure reward is always a number
        const ubtReward = parseFloat((Math.random() + 0.5).toFixed(2));
        
        // Get consecutive days (if available)
        let consecutiveDays = 1;
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData && userData.dailySignIn && userData.dailySignIn.consecutiveDays) {
            consecutiveDays = parseInt(userData.dailySignIn.consecutiveDays) + 1;
        }
        
        // Send sign-in data to server
        const updatedUserData = await sendSignInDataToServer(token, ubtReward, consecutiveDays);
        
        if (updatedUserData) {
            // Update local storage with new user data
            localStorage.setItem('userData', JSON.stringify(updatedUserData));
            
            // Update UI to reflect successful sign-in
            dailySignInButton.classList.add('signed-in');
            dailySignInButton.innerHTML = '<i class="fas fa-check-circle"></i> Signed In Today';
            dailySignInButton.disabled = true;
            
            // Show success notification
            showNotification(`Daily sign-in successful! You earned ${ubtReward.toFixed(2)} UBT.`, 'success');
            
            // Update balance display if it exists
            const balanceElement = document.getElementById('ubtBalance');
            if (balanceElement && updatedUserData.balances && updatedUserData.balances.ubt !== undefined) {
                balanceElement.textContent = updatedUserData.balances.ubt.toFixed(2);
            }
        }
    } catch (error) {
        // Re-enable button on error
        const dailySignInButton = document.getElementById('dailySignInButton');
        dailySignInButton.disabled = false;
        dailySignInButton.innerHTML = '<i class="fas fa-calendar-check"></i> Daily Sign In';
        
        // Show error notification
        showNotification(`Sign-in failed: ${error.message}. Please try again later.`, 'error');
    }
}

/**
 * Check if the user has already signed in today
 */
async function checkDailySignInStatus() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`${API_URL}/api/daily-signin/status`, {
            headers: {
                'x-auth-token': token,
                'Origin': window.location.origin
            },
            credentials: 'include',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error('Failed to check sign-in status');
        }
        
        const data = await response.json();
        
        // If user has already signed in today, update button state
        if (data.signedInToday) {
            const dailySignInButton = document.getElementById('dailySignInButton');
            dailySignInButton.classList.add('signed-in');
            dailySignInButton.disabled = true;
            dailySignInButton.innerHTML = '<i class="fas fa-check-circle"></i> Signed In Today';
            dailySignInButton.style.opacity = '1';
        }
    } catch (error) {
        console.error('Error checking daily sign-in status:', error);
        // Don't show error notification for this, just leave button in default state
        const dailySignInButton = document.getElementById('dailySignInButton');
        dailySignInButton.innerHTML = '<i class="fas fa-calendar-check"></i> Daily Sign In';
        dailySignInButton.style.opacity = '1';
    }
}
/**
 * Send sign-in data to server
 * Makes an API call to the backend to record the sign-in and update UBT balance.
 * Returns the updated user data object on success, null otherwise.
 */
async function sendSignInDataToServer(token, ubtReward, consecutiveDays) {
    console.log(`Attempting to sign in. Reward: ${ubtReward} UBT.`);
    console.log("API_URL value:", typeof API_URL !== "undefined" ? API_URL : "API_URL is UNDEFINED");
    
    try {
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            mode: 'cors',
            body: JSON.stringify({
                reward: parseFloat(ubtReward), // Ensure reward is sent as a number
                consecutiveDays: parseInt(consecutiveDays) // Ensure consecutiveDays is sent as a number
            })
        };
        console.log("Fetch options:", JSON.stringify(fetchOptions, null, 2)); // Log fetch options
        const response = await fetch(`${API_URL}/api/daily-signin`, fetchOptions);
        const data = await response.json();
        if (!response.ok) {
            // Throw an error with the message from the backend, or a default one
            throw new Error(data.message || `Server responded with status ${response.status}`);
        }
        console.log('Sign-in Success:', data);
        // Assuming the backend returns the full updated user object upon successful sign-in
        if (data && data.userData) {
             return data.userData; 
        } else {
             console.warn('Backend did not return updated user data in expected format.');
             // Attempt to fetch user data manually as a fallback
             return await fetchUpdatedUserData(token);
        }
    } catch (error) {
        console.error('Error sending sign-in data:', error);
        // Re-throw the error to be caught by handleDailySignIn
        throw error; 
    }
}
// Helper function to fetch user data - similar to dashboard logic
async function fetchUpdatedUserData(token) {
    try {
        const response = await fetch(`${API_URL}/api/auth`, {
            headers: {
                'x-auth-token': token,
                'Origin': window.location.origin
            },
            credentials: 'include',
            mode: 'cors'
        });
        if (!response.ok) {
            throw new Error('Failed to fetch updated user data');
        }
        const userData = await response.json();
        console.log('Fetched updated user data:', userData);
        return userData;
    } catch (error) {
        console.error('Error fetching updated user data:', error);
        return null; // Return null if fetching fails
    }
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
        notification.style.opacity = '0'; // Start hidden
        notification.style.transform = 'translateY(20px)'; // Start off-screen
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
    
    // Show notification with animation
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    });
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
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
    
    #dailySignInButton:hover:not(.signed-in):not(:disabled) {
        transform: scale(1.05);
    }
    #dailySignInButton:disabled {
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);
