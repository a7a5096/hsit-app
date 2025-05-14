/**
 * HSIT App - Daily Sign In Functionality
 * This script handles the daily sign-in feature for HSIT App users
 * Credits users with 0.5 to 1.5 UBT per day
 * Includes API call to update backend and refresh local user data.
 */

// API_URL is now expected to be globally available from config.js

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
            dailySignInButton.disabled = true; // Disable button
        } else {
            // User has not signed in today
            signInText.textContent = 'Daily Sign In';
            dailySignInButton.classList.remove('signed-in');
            dailySignInButton.style.opacity = '1';
            dailySignInButton.disabled = false; // Ensure button is enabled
            
            // Add click event listener
            dailySignInButton.addEventListener('click', handleDailySignIn);
        }
    }
}

/**
 * Handle the daily sign-in process
 */
async function handleDailySignIn(event) {
    event.preventDefault();
    
    const dailySignInButton = document.getElementById('dailySignInButton');
    const signInText = document.getElementById('signInText');
    const token = localStorage.getItem('token');

    if (!token) {
        showNotification('Authentication error. Please log in again.', 'error');
        return;
    }

    // Disable button immediately to prevent multiple clicks
    dailySignInButton.disabled = true;
    signInText.textContent = 'Signing In...';
    dailySignInButton.style.opacity = '0.7';

    const today = new Date().toDateString();
    
    // Calculate consecutive days
    let consecutiveDays = parseInt(localStorage.getItem('consecutiveDays') || '0');
    const lastSignInDate = localStorage.getItem('lastSignInDate');
    
    if (lastSignInDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toDateString();
        
        if (lastSignInDate === yesterdayString) {
            consecutiveDays++;
        } else if (lastSignInDate !== today) {
            consecutiveDays = 1;
        }
    } else {
        consecutiveDays = 1;
    }
    
    // Calculate UBT reward - random between 0.5 and 1.5 UBT
    const ubtReward = parseFloat((Math.random() * (1.5 - 0.5) + 0.5).toFixed(2));

    try {
        // Send sign-in data to server
        const updatedUserData = await sendSignInDataToServer(token, ubtReward, consecutiveDays);

        if (updatedUserData) {
            // Record sign-in locally ONLY after successful server update
            localStorage.setItem('lastSignIn', today);
            localStorage.setItem('consecutiveDays', consecutiveDays.toString());
            localStorage.setItem('lastSignInDate', today);
            
            // Update local user data storage
            localStorage.setItem('userData', JSON.stringify(updatedUserData));

            // Update UI
            signInText.textContent = 'Already Signed In Today';
            dailySignInButton.classList.add('signed-in');
            dailySignInButton.removeEventListener('click', handleDailySignIn); // Remove listener

            // Show success notification with reward
            showNotification(`Daily sign-in successful! You've earned ${ubtReward} UBT. Consecutive days: ${consecutiveDays}! Your new balance is ${updatedUserData.balances.ubt.toFixed(2)} UBT.`, 'success');
            
            // Optional: If on dashboard, trigger immediate UI update of balance
            const balanceElement = document.querySelector('.balance-amount'); // Attempt to find balance element
            if (balanceElement && updatedUserData.balances && updatedUserData.balances.ubt !== undefined) {
                 balanceElement.textContent = `${updatedUserData.balances.ubt.toFixed(2)} UBT`;
            }

        } else {
            // Handle case where server update failed but didn't throw error (e.g., validation error)
            showNotification('Sign-in failed. Please try again.', 'error');
            // Re-enable button
            dailySignInButton.disabled = false;
            signInText.textContent = 'Daily Sign In';
            dailySignInButton.style.opacity = '1';
        }

    } catch (error) {
        console.error('Error during sign-in:', error);
        showNotification(`Sign-in failed: ${error.message}. Please try again later.`, 'error');
        // Re-enable button on error
        dailySignInButton.disabled = false;
        signInText.textContent = 'Daily Sign In';
        dailySignInButton.style.opacity = '1';
    }
}

/**
 * Send sign-in data to server
 * Makes an API call to the backend to record the sign-in and update UBT balance.
 * Returns the updated user data object on success, null otherwise.
 */
async function sendSignInDataToServer(token, ubtReward, consecutiveDays) {
    console.log(`Attempting to sign in. Reward: ${ubtReward} UBT. Consecutive days: ${consecutiveDays}`);
    console.log("API_URL value:", typeof API_URL !== "undefined" ? API_URL : "API_URL is UNDEFINED");
    console.log("Token value:", typeof token === "string" && token.length > 0 ? token : "Token is INVALID or EMPTY", "Type:", typeof token); // Diagnostic log for token
    
    try {
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            mode: 'cors',
            body: JSON.stringify({
                reward: ubtReward,
                consecutiveDays: consecutiveDays
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
        
        // Consider removing from DOM after fade out, but re-creating is fine too
        // setTimeout(() => {
        //     if (notification.parentNode) {
        //         notification.parentNode.removeChild(notification);
        //     }
        // }, 300);
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

