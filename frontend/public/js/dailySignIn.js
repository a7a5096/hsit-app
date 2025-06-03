/**
 * HSIT App - Daily Sign In Functionality
 * This script handles the daily sign-in feature for HSIT App users
 * Credits users with 0.5 to 1.5 UBT per day
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
function initDailySignIn() {
    const dailySignInButton = document.getElementById("dailySignInButton");
    const signInText = document.getElementById("signInText");
    
    if (dailySignInButton) {
        const lastSignIn = localStorage.getItem("lastSignIn");
        const today = new Date().toDateString();
        
        if (lastSignIn === today) {
            signInText.textContent = "Already Signed In Today";
            dailySignInButton.classList.add("signed-in");
            dailySignInButton.style.opacity = "0.7";
            dailySignInButton.disabled = true;
        } else {
            signInText.textContent = "Daily Sign In";
            dailySignInButton.classList.remove("signed-in");
            dailySignInButton.style.opacity = "1";
            dailySignInButton.disabled = false;
            dailySignInButton.addEventListener("click", handleDailySignIn);
        }
    }
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

    dailySignInButton.disabled = true;
    signInText.textContent = "Signing In...";
    dailySignInButton.style.opacity = "0.7";

    const today = new Date().toDateString();
    let consecutiveDays = parseInt(localStorage.getItem("consecutiveDays") || "0");
    const lastSignInDate = localStorage.getItem("lastSignInDate");
    
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
    
    const ubtReward = parseFloat((Math.random() * (1.5 - 0.5) + 0.5).toFixed(2));

    try {
        const updatedUserData = await sendSignInDataToServer(token, ubtReward, consecutiveDays);

        if (updatedUserData) {
            localStorage.setItem("lastSignIn", today);
            localStorage.setItem("consecutiveDays", consecutiveDays.toString());
            localStorage.setItem("lastSignInDate", today);
            localStorage.setItem("userData", JSON.stringify(updatedUserData));

            signInText.textContent = "Already Signed In Today";
            dailySignInButton.classList.add("signed-in");
            dailySignInButton.removeEventListener("click", handleDailySignIn);

            showNotification(`Daily sign-in successful! You've earned ${ubtReward} UBT. Consecutive days: ${consecutiveDays}! Your new balance is ${updatedUserData.balances.ubt.toFixed(2)} UBT.`, "success");
            
            const balanceElement = document.querySelector(".balance-amount");
            if (balanceElement && updatedUserData.balances && updatedUserData.balances.ubt !== undefined) {
                 balanceElement.textContent = `${updatedUserData.balances.ubt.toFixed(2)} UBT`;
            }
        } else {
            showNotification("Sign-in failed. Please try again. (No user data returned)", "error");
            dailySignInButton.disabled = false;
            signInText.textContent = "Daily Sign In";
            dailySignInButton.style.opacity = "1";
        }
    } catch (error) {
        console.error("Error during sign-in (in handleDailySignIn):", error);
        showNotification(`Sign-in failed: ${error.message}. Please try again later.`, "error");
        dailySignInButton.disabled = false;
        signInText.textContent = "Daily Sign In";
        dailySignInButton.style.opacity = "1";
    }
}

/**
 * Send sign-in data to server
 */
async function sendSignInDataToServer(token, ubtReward, consecutiveDays) {
    console.log(`Attempting to sign in. API URL: ${API_URL}/api/daily-signin, Reward: ${ubtReward} UBT, Consecutive days: ${consecutiveDays}`);
    try {
        const response = await fetch(`${API_URL}/api/daily-signin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-auth-token": token,
            },
            mode: "cors",
            body: JSON.stringify({
                reward: ubtReward,
                consecutiveDays: consecutiveDays
            }),
        });

        if (!response.ok) {
            let errorMsg = `Server responded with status ${response.status} ${response.statusText}`;
            let errorDetails = "";
            try {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await response.json();
                    errorDetails = JSON.stringify(errorData);
                    errorMsg = errorData.message || errorData.msg || errorDetails || errorMsg;
                } else {
                    errorDetails = await response.text();
                    errorMsg = errorDetails || errorMsg;
                }
            } catch (e) {
                console.warn("Could not parse error response body:", e);
            }
            console.error("Sign-in API request failed. Status:", response.status, "Message:", errorMsg, "Details:", errorDetails);
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log("Sign-in Success Response Data:", data);

        if (data && data.success && data.userData) {
             return data.userData; 
        } else {
             const warnMsg = "Backend did not return success or updated user data in expected format.";
             console.warn(warnMsg, data);
             throw new Error(data.message || warnMsg);
        }

    } catch (error) {
        console.error("Error in sendSignInDataToServer (fetch call or response processing):", error);
        throw new Error(error.message || "A network or processing error occurred during sign-in.");
    }
}

async function fetchUpdatedUserData(token) {
    try {
        const response = await fetch(`${API_URL}/api/auth`, {
            headers: {
                "x-auth-token": token,
            },
            mode: "cors"
        });
        if (!response.ok) {
            throw new Error("Failed to fetch updated user data");
        }
        const userData = await response.json();
        console.log("Fetched updated user data:", userData);
        return userData;
    } catch (error) {
        console.error("Error fetching updated user data:", error);
        return null;
    }
}

function showNotification(message, type = "info") {
    let notification = document.getElementById("hsit-notification");
    if (!notification) {
        notification = document.createElement("div");
        notification.id = "hsit-notification";
        document.body.appendChild(notification);
        notification.style.position = "fixed";
        notification.style.bottom = "20px";
        notification.style.right = "20px";
        notification.style.padding = "15px 20px";
        notification.style.borderRadius = "5px";
        notification.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
        notification.style.zIndex = "1000";
        notification.style.maxWidth = "300px";
        notification.style.transition = "all 0.3s ease-in-out";
        notification.style.opacity = "0";
        notification.style.transform = "translateY(20px)";
    }
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
    notification.textContent = message;
    requestAnimationFrame(() => {
        notification.style.opacity = "1";
        notification.style.transform = "translateY(0)";
    });
    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateY(20px)";
    }, 5000);
}

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
