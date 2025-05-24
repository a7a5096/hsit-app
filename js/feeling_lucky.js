// Refactored Feeling Lucky page script
// Uses centralized auth_utils.js for all user data and balance operations

import { requireAuth, fetchUserData, updateGlobalBalanceDisplay, initGlobalBalanceDisplay } from './auth_utils.js';

// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in and redirect if not
    if (!requireAuth()) return;

    // Initialize global balance display
    await initGlobalBalanceDisplay();
    
    const luckyButton = document.getElementById('lucky-button');
    const resultDisplay = document.getElementById('result-display');
    const resultText = document.getElementById('result-text');
    const remainingTriesElement = document.getElementById('remaining-tries');
    
    // Define the possible prizes
    const prizes = [
        { label: "1 UBT", value: 1, type: 'UBT', probability: 0.1 },
        { label: "10 UBT", value: 10, type: 'UBT', probability: 0.05 },
        { label: "20 USDT", value: 20, type: 'USDT', probability: 0.02 },
        { label: "Better luck next time", value: 0, type: 'None', probability: 0.83 }
    ];
    
    // Function to reset daily tries if it's a new day
    async function resetDailyTriesIfNeeded(userData) {
        const today = new Date().toISOString().split('T')[0];
        
        if (userData.lastLuckyReset !== today) {
            console.log("New day detected, resetting lucky tries.");
            // It's a new day, reset tries based on bot count via API
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/lucky/reset-tries`, {
                    method: 'POST',
                    headers: {
                        'x-auth-token': token,
                        'Origin': window.location.origin
                    },
                    credentials: 'include',
                    mode: 'cors'
                });

                if (!response.ok) {
                    throw new Error(`Failed to reset tries via API: ${response.statusText}`);
                }

                const updatedData = await response.json();
                console.log("Tries reset successfully via API:", updatedData);
                return updatedData.userData; // Return the fresh user data

            } catch (error) {
                console.error("Error resetting lucky tries via API:", error);
                showNotification("Failed to reset daily tries. Please refresh.", "error");
                // Return original data, but tries might be incorrect
                return userData; 
            }
        } else {
            // Not a new day, return existing data
            return userData;
        }
    }
    
    // Function to update the UI with remaining tries
    function updateRemainingTriesUI(tries) {
        remainingTriesElement.textContent = tries;
        
        // Enable/disable button based on remaining tries
        if (tries <= 0) {
            luckyButton.disabled = true;
            luckyButton.textContent = "No Tries Left Today";
            luckyButton.style.opacity = '0.7';
        } else {
            luckyButton.disabled = false;
            luckyButton.textContent = "I'm Feeling Lucky!";
            luckyButton.style.opacity = '1';
        }
    }
    
    // Function to select a prize based on probabilities
    function selectPrize() {
        const random = Math.random();
        let cumulativeProbability = 0;
        
        for (const prize of prizes) {
            cumulativeProbability += prize.probability;
            if (random <= cumulativeProbability) {
                return prize;
            }
        }
        
        // Fallback to the last prize (likely 'Better luck next time')
        return prizes[prizes.length - 1];
    }

    // Function to record the win and update balance via API
    async function recordWin(prize) {
        if (prize.value <= 0) {
            // No need to call API for 'Better luck next time'
            console.log("No prize won, skipping API call.");
            return true; // Indicate success (no action needed)
        }

        console.log(`Recording win: ${prize.label}`);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/lucky/record-win`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                    'Origin': window.location.origin
                },
                credentials: 'include',
                mode: 'cors',
                body: JSON.stringify({
                    prizeValue: prize.value,
                    prizeType: prize.type // e.g., 'UBT' or 'USDT'
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Server responded with status ${response.status}`);
            }

            console.log("Win recorded successfully:", data);
            
            // Update global balance display
            await updateGlobalBalanceDisplay();
            
            return true;
        } catch (error) {
            console.error("Error recording win via API:", error);
            showNotification(`Failed to record prize: ${error.message}`, "error");
            return false; // Indicate failure
        }
    }
    
    // Function to handle the lucky button click
    async function handleLuckyButtonClick() {
        if (!requireAuth()) return;

        // Disable button during processing
        luckyButton.disabled = true;
        luckyButton.textContent = "Processing...";
        luckyButton.style.opacity = '0.7';
        resultDisplay.classList.remove('show'); // Hide previous result
        
        try {
            // Get fresh user data from API
            let userData = await fetchUserData();
            if (!userData) {
                throw new Error("Failed to fetch user data");
            }
            
            // Reset tries if it's a new day (fetches fresh data if reset happens)
            userData = await resetDailyTriesIfNeeded(userData);
            if (!userData) { // If reset failed critically
                 throw new Error("Failed to initialize user data after reset check.");
            }

            // Double-check remaining tries from potentially updated data
            if (userData.remainingLuckyTries <= 0) {
                resultText.textContent = "You have no tries left today. Come back tomorrow!";
                resultDisplay.classList.add('show');
                updateRemainingTriesUI(0);
                return; // Exit early
            }
            
            // Select a prize (client-side decision)
            const prize = selectPrize();
            console.log("Prize selected:", prize);
            
            // Attempt to record the win/loss and update balance via API
            const recordSuccess = await recordWin(prize);

            if (recordSuccess) {
                // Fetch the absolute latest user data after the win was recorded
                const finalUserData = await fetchUserData();
                if (!finalUserData) {
                    throw new Error("Failed to fetch final user data after recording win.");
                }

                // Display the result
                resultText.textContent = `You got: ${prize.label}`;
                resultDisplay.classList.add('show');
                
                // Update UI with remaining tries from the latest data
                updateRemainingTriesUI(finalUserData.remainingLuckyTries);

                // Show notification for actual wins
                if (prize.value > 0) {
                    showNotification(`Congratulations! You won ${prize.label}!`, "success");
                }

            } else {
                // API call failed, result wasn't recorded, don't decrement tries visually yet
                resultText.textContent = "Failed to record result. Please try again.";
                resultDisplay.classList.add('show');
                // Re-enable button since the try wasn't used
                luckyButton.disabled = false;
                luckyButton.textContent = "I'm Feeling Lucky!";
                luckyButton.style.opacity = '1';
            }
            
        } catch (error) {
            console.error("Error processing lucky button click:", error);
            resultText.textContent = `An error occurred: ${error.message}. Please try again.`;
            resultDisplay.classList.add('show');
            
            // Re-enable button on error
            luckyButton.disabled = false;
            luckyButton.textContent = "I'm Feeling Lucky!";
            luckyButton.style.opacity = '1';
        }
    }
    
    // Initialize the page
    async function initPage() {
        if (!requireAuth()) return;

        luckyButton.disabled = true; // Disable initially
        luckyButton.textContent = "Loading...";

        try {
            // Get user data (fetches from API)
            let userData = await fetchUserData();
            if (!userData) return; // fetchUserData handles errors
            
            // Reset tries if it's a new day (fetches fresh data if reset happens)
            userData = await resetDailyTriesIfNeeded(userData);
            if (!userData) return; // resetDailyTriesIfNeeded handles errors
            
            // Update UI with potentially updated data
            updateRemainingTriesUI(userData.remainingLuckyTries);
            
        } catch (error) {
            console.error("Error initializing page:", error);
            remainingTriesElement.textContent = "Error";
            luckyButton.textContent = "Error Loading";
            showNotification("Failed to load lucky wheel data. Please refresh.", "error");
        }
    }
    
    // Add event listener to the lucky button
    luckyButton.addEventListener('click', handleLuckyButtonClick);
    
    // Initialize the page when loaded
    initPage();
});

// Shared showNotification function
function showNotification(message, type = 'info') {
    let notification = document.getElementById('hsit-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'hsit-notification';
        document.body.appendChild(notification);
        Object.assign(notification.style, {
            position: 'fixed', bottom: '20px', right: '20px',
            padding: '15px 20px', borderRadius: '5px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)', zIndex: '1000',
            maxWidth: '300px', transition: 'all 0.3s ease-in-out',
            opacity: '0', transform: 'translateY(20px)'
        });
    }
    if (type === 'success') { notification.style.backgroundColor = '#4CAF50'; notification.style.color = 'white'; }
    else if (type === 'error') { notification.style.backgroundColor = '#F44336'; notification.style.color = 'white'; }
    else { notification.style.backgroundColor = '#2196F3'; notification.style.color = 'white'; }
    notification.textContent = message;
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
    }, 5000);
}
