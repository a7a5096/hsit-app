// Script to handle feeling lucky functionality with CORS-enabled API configuration
// No external config dependency - completely self-contained

// API configuration directly integrated into this file
const API_URL = 'https://huqwwv8anj.execute-api.us-east-1.amazonaws.com/prod';

document.addEventListener('DOMContentLoaded', () => {
    const luckyButton = document.getElementById('lucky-button');
    const resultDisplay = document.getElementById('result-display');
    const resultText = document.getElementById('result-text');
    const remainingTriesElement = document.getElementById('remaining-tries');
    
    // Define the possible prizes (same structure as the wheel)
    const prizes = [
        { label: "1 UBT", value: 1, probability: 0.1 },
        { label: "10 UBT", value: 10, probability: 0.05 },
        { label: "20 USDT", value: 20, probability: 0.02 },
        { label: "Better luck next time", value: 0, probability: 0.83 }
    ];
    
    // Function to get user data including bot count and remaining tries
    async function getUserData() {
        try {
            // First try to get token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/index.html';
                return null;
            }
            
            // Try to get user data from API
            try {
                const response = await fetch(`${API_URL}/api/auth`, {
                    headers: {
                        'x-auth-token': token,
                        'Origin': window.location.origin
                    },
                    credentials: 'include',
                    mode: 'cors'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Store updated user data
                    localStorage.setItem('userData', JSON.stringify(data));
                    return data;
                }
            } catch (apiError) {
                console.error("API error:", apiError);
                // Fall back to localStorage if API fails
            }
            
            // Check if we have user data in localStorage
            const userData = localStorage.getItem('userData');
            if (userData) {
                return JSON.parse(userData);
            }
            
            // Mock data if no localStorage data exists
            return {
                username: "TestUser",
                botsPurchased: ["100", "300", "500"], // Example: user has 3 bots
                remainingLuckyTries: 3, // Should match bot count initially
                lastLuckyReset: new Date().toISOString().split('T')[0] // Today's date
            };
        } catch (error) {
            console.error("Error fetching user data:", error);
            return {
                botsPurchased: [],
                remainingLuckyTries: 0,
                lastLuckyReset: ""
            };
        }
    }
    
    // Function to save user data
    function saveUserData(userData) {
        try {
            localStorage.setItem('userData', JSON.stringify(userData));
        } catch (error) {
            console.error("Error saving user data:", error);
        }
    }
    
    // Function to reset daily tries if it's a new day
    function resetDailyTriesIfNeeded(userData) {
        const today = new Date().toISOString().split('T')[0];
        
        if (userData.lastLuckyReset !== today) {
            // It's a new day, reset tries based on bot count
            userData.remainingLuckyTries = userData.botsPurchased ? userData.botsPurchased.length : 0;
            userData.lastLuckyReset = today;
            saveUserData(userData);
        }
        
        return userData;
    }
    
    // Function to update the UI with remaining tries
    function updateRemainingTriesUI(tries) {
        remainingTriesElement.textContent = tries;
        
        // Enable/disable button based on remaining tries
        if (tries <= 0) {
            luckyButton.disabled = true;
            luckyButton.textContent = "No Tries Left Today";
        } else {
            luckyButton.disabled = false;
            luckyButton.textContent = "I'm Feeling Lucky!";
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
        
        // Fallback to the last prize (should never reach here if probabilities sum to 1)
        return prizes[prizes.length - 1];
    }
    
    // Function to handle the lucky button click
    async function handleLuckyButtonClick() {
        // Disable button during processing
        luckyButton.disabled = true;
        luckyButton.textContent = "Processing...";
        
        try {
            // Get user data
            let userData = await getUserData();
            if (!userData) return;
            
            // Reset tries if it's a new day
            userData = resetDailyTriesIfNeeded(userData);
            
            // Check if user has remaining tries
            if (userData.remainingLuckyTries <= 0) {
                resultText.textContent = "You have no tries left today. Come back tomorrow!";
                resultDisplay.classList.add('show');
                updateRemainingTriesUI(0);
                return;
            }
            
            // Simulate server request delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Select a prize
            const prize = selectPrize();
            
            // Update user data
            userData.remainingLuckyTries--;
            saveUserData(userData);
            
            // Display the result
            resultText.textContent = `Congratulations! You won: ${prize.label}`;
            resultDisplay.classList.add('show');
            
            // Update UI
            updateRemainingTriesUI(userData.remainingLuckyTries);
            
            // In a real implementation, you would send an API request to update the user's balance
            // and record the prize won
            
        } catch (error) {
            console.error("Error processing lucky button click:", error);
            resultText.textContent = "An error occurred. Please try again.";
            resultDisplay.classList.add('show');
            
            // Re-enable button
            luckyButton.disabled = false;
            luckyButton.textContent = "I'm Feeling Lucky!";
        }
    }
    
    // Initialize the page
    async function initPage() {
        try {
            // Get user data
            let userData = await getUserData();
            if (!userData) return;
            
            // Reset tries if it's a new day
            userData = resetDailyTriesIfNeeded(userData);
            
            // Update UI
            updateRemainingTriesUI(userData.remainingLuckyTries);
            
        } catch (error) {
            console.error("Error initializing page:", error);
            remainingTriesElement.textContent = "Error";
        }
    }
    
    // Add event listener to the lucky button
    luckyButton.addEventListener('click', handleLuckyButtonClick);
    
    // Initialize the page when loaded
    initPage();
});
