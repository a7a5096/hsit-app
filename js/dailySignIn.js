/**
 * HSIT App - Daily Sign In Functionality
 * This script handles the daily sign-in feature for HSIT App users
 * Credits users with 0.25 to 1.25 UBT per day
 * Includes API call to update backend and refresh local user data.
 */

// API configuration - Ensure this matches your backend URL
const API_URL = "https://hsit-backend.onrender.com";

document.addEventListener("DOMContentLoaded", function() {
    // Initialize the daily sign-in functionality
    initDailySignIn();
});

/**
 * Initialize the daily sign-in functionality
 */
async function initDailySignIn() {
    const dailySignInButton = document.getElementById("dailySignInButton");
    const signInText = document.getElementById("signInText");
    
    if (!dailySignInButton) return;
    
    const token = localStorage.getItem("token");
    if (!token) {
        console.warn("No authentication token found. User must log in first.");
        return;
    }
    
    try {
        // Fetch user data from server to check sign-in status
        const userData = await fetchUpdatedUserData(token);
        
        if (!userData) {
            console.error("Failed to fetch user data");
            return;
        }
        
        // Store the latest user data
        localStorage.setItem("userData", JSON.stringify(userData));
        
        // Check if user has already signed in today based on server data
        const hasSignedInToday = hasAlreadySignedInToday(userData);
        
        if (hasSignedInToday) {
            // User has already signed in today according to server data
            signInText.textContent = "Already Signed In Today";
            dailySignInButton.classList.add("signed-in");
            dailySignInButton.style.opacity = "0.7";
            dailySignInButton.disabled = true;
        } else {
            // User has not signed in today
            signInText.textContent = "Daily Sign In";
            dailySignInButton.classList.remove("signed-in");
            dailySignInButton.style.opacity = "1";
            dailySignInButton.disabled = false;
            
            // Remove any existing event listeners to prevent duplicates
            dailySignInButton.removeEventListener("click", handleDailySignIn);
            // Add click event listener
            dailySignInButton.addEventListener("click", handleDailySignIn);
        }
    } catch (error) {
        console.error("Error initializing daily sign-in:", error);
        // Set default state if there's an error
        signInText.textContent = "Daily Sign In";
        dailySignInButton.disabled = false;
    }
}

/**
 * Check if user has already signed in today based on server data
 */
function hasAlreadySignedInToday(userData) {
    if (!userData || !userData.dailySignIn || !userData.dailySignIn.lastSignInDate) {
        return false;
    }
    
    const lastSignInDate = new Date(userData.dailySignIn.lastSignInDate);
    const today = new Date();
    
    // Compare only the date parts (year, month, day)
    return lastSignInDate.getFullYear() === today.getFullYear() &&
           lastSignInDate.getMonth() === today.getMonth() &&
           lastSignInDate.getDate() === today.getDate();
}

/**
 * Handle the daily sign-in process
 */
async function handleDailySignIn(event) {
    event.preventDefault();
    
    const dailySignInButton = document.getElementById("dailySignInButton");
    const signInText = document.getElementById("signInText");
    const token = localStorage.getItem("token");

    if (!token) {
        showNotification("Authentication error. Please log in again.", "error");
        return;
    }

    // Disable button immediately to prevent multiple clicks
    dailySignInButton.disabled = true;
    signInText.textContent = "Signing In...";
    dailySignInButton.style.opacity = "0.7";
    
    // Calculate UBT reward - random between 0.25 and 1.25 UBT
    const ubtReward = parseFloat((Math.random() * (1.25 - 0.25) + 0.25).toFixed(2));

    try {
        // Send sign-in data to server
        const updatedUserData = await sendSignInDataToServer(token, ubtReward);

        if (updatedUserData) {
            // Update local user data storage with server response
            localStorage.setItem("userData", JSON.stringify(updatedUserData));

            // Update UI
            signInText.textContent = "Already Signed In Today";
            dailySignInButton.classList.add("signed-in");
            dailySignInButton.removeEventListener("click", handleDailySignIn);

            // Show success notification with reward
            showNotification(
                `Daily sign-in successful! You've earned ${ubtReward.toFixed(2)} UBT. ` +
                `Consecutive days: ${updatedUserData.dailySignIn.consecutiveDays}! ` +
                `Your new balance is ${updatedUserData.balances.ubt.toFixed(2)} UBT.`, 
                "success"
            );
            
            // Update balance display if on dashboard
            const balanceElement = document.querySelector(".balance-amount");
            if (balanceElement && updatedUserData.balances && updatedUserData.balances.ubt !== undefined) {
                 balanceElement.textContent = `${updatedUserData.balances.ubt.toFixed(2)} UBT`;
            }
        } else {
            // Handle case where server update failed but didn't throw error
            showNotification("Sign-in failed. Please try again.", "error");
            // Re-enable button
            dailySignInButton.disabled = false;
            signInText.textContent = "Daily Sign In";
            dailySignInButton.style.opacity = "1";
        }
    } catch (error) {
        console.error("Error during sign-in:", error);
        showNotification(`Sign-in failed: ${error.message}. Please try again later.`, "error");
        // Re-enable button on error
        dailySignInButton.disabled = false;
        signInText.textContent = "Daily Sign In";
        dailySignInButton.style.opacity = "1";
    }
}

/**
 * Send sign-in data to server
 */
async function sendSignInDataToServer(token, ubtReward) {
    console.log(`Attempting to sign in. Reward: ${ubtReward} UBT.`);
    
    try {
        const response = await fetch(`${API_URL}/api/daily-signin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": token
            },
            mode: "cors",
            body: JSON.stringify({
                reward: ubtReward
            })
        });

        // Handle non-OK responses
        if (!response.ok) {
            let errorMsg = `Server responded with status ${response.status}`;
            
            try {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorData.msg || errorMsg;
                } else {
                    const errorText = await response.text();
                    if (errorText) errorMsg = errorText;
                }
            } catch (e) {
                console.warn("Could not parse error response body:", e);
            }
            
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("Sign-in Success Response:", data);

        if (data && data.success && data.userData) {
            return data.userData;
        } else {
            throw new Error(data.message || "Server did not return expected user data");
        }
    } catch (error) {
        console.error("Error sending sign-in data:", error);
        throw error;
    }
}

/**
 * Fetch updated user data from server
 */
async function fetchUpdatedUserData(token) {
    try {
        const response = await fetch(`${API_URL}/api/auth`, {
            headers: {
                "x-auth-token": token
            },
            mode: "cors"
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.status}`);
        }
        
        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
}

/**
 * Show a notification to the user
 */
function showNotification(message, type = "info") {
    // Create notification element if it doesn't exist
    let notification = document.getElementById("hsit-notification");
    
    if (!notification) {
        notification = document.createElement("div");
        notification.id = "hsit-notification";
        document.body.appendChild(notification);
        
        // Add styles
        notification.style.position = "fixed";
        notification.style.bottom = "20px";
        notification.style.right = "20px";
        notification.style.padding = "15px 20px";
        notification.style.borderRadius = "5px";
        notification.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
        notification.style.zIndex = "1000";
        notification.style.maxWidth = "300px";
        notification.style.transition = "all 0.3s ease-in-out";
        notification.style.opacity = "0"; // Start hidden
        notification.style.transform = "translateY(20px)"; // Start off-screen
    }
    
    // Set type-specific styles
    if (type === "success") {
        notification.style.backgroundColor = "#4CAF50";
        notification.style.color = "white";
    } else if (type === "error") {
        notification.style.backgroundColor = "#F44336";
        notification.style.color = "white";
    } else {
        notification.style.backgroundColor = "#2196F3";
        notification.style.color = "white";
    }
    
    // Set message
    notification.textContent = message;
    
    // Show notification with animation
    requestAnimationFrame(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";
    });
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateY(20px)";
    }, 5000);
}

// Add CSS for the daily sign-in button
const style = document.createElement("style");
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

