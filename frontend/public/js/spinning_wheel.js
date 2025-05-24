// spinning_wheel.js - Updated version

// Define the new prize structure according to requirements
const prizes = [
    { color: "#000000", value: 0, description: "Sorry, you lost" },     // Black - 0x wager
    { color: "#0000FF", value: 1, description: "1x your wager" },       // Blue - 1x wager
    { color: "#000000", value: 0, description: "Sorry, you lost" },     // Black - 0x wager
    { color: "#FFFF00", value: 2, description: "2x your wager" },       // Yellow - 2x wager
    { color: "#000000", value: 0, description: "Sorry, you lost" },     // Black - 0x wager
    { color: "#0000FF", value: 1, description: "1x your wager" },       // Blue - 1x wager
    { color: "#000000", value: 0, description: "Sorry, you lost" },     // Black - 0x wager
    { color: "#FF0000", value: 10, description: "10x your wager" },     // Red - 10x wager
    { color: "#000000", value: 0, description: "Sorry, you lost" },     // Black - 0x wager
    { color: "#0000FF", value: 1, description: "1x your wager" },       // Blue - 1x wager
    { color: "#000000", value: 0, description: "Sorry, you lost" },     // Black - 0x wager
    { color: "#FFFF00", value: 2, description: "2x your wager" }        // Yellow - 2x wager
];

const wheelElement = document.getElementById("wheel");
const spinButton = document.getElementById("spin-button");
const resultMessage = document.getElementById("result-message");
const winningsAmount = document.getElementById("winnings-amount");
const newUbtBalanceElement = document.getElementById("new-ubt-balance");
const ubtBalanceElement = document.getElementById("ubt-balance");
const legendElement = document.getElementById("prize-legend");

let isSpinning = false;
let currentRotation = 0;

// --- API Interaction Functions (Hypothetical Backend) ---
const API_URL = "https://hsit-backend.onrender.com"; // Correct backend URL

async function fetchUserBalanceAPI() {
    try {
        const response = await fetch(`${API_URL}/api/ubt/balance`); // GET request
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
            throw new Error(errorData.message || `Failed to fetch balance.`);
        }
        const data = await response.json();
        return data.balance; // Expects { "balance": 123.45 }
    } catch (error) {
        console.error("API Error (fetchUserBalanceAPI):", error);
        throw error;
    }
}

async function placeBetAndDetermineOutcomeAPI(wagerAmount) {
    try {
        const response = await fetch(`${API_URL}/api/ubt/spin`, { // POST request
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wager: wagerAmount })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
            throw new Error(errorData.message || `Failed to place bet.`);
        }
        const data = await response.json();
        
        // For testing purposes, generate a random outcome if the server doesn't provide one
        if (!data.winningSegmentIndex) {
            const randomIndex = Math.floor(Math.random() * prizes.length);
            const prize = prizes[randomIndex];
            
            // Calculate winnings based on wager and prize multiplier
            const winnings = wagerAmount * prize.value;
            
            // Mock the server response
            data.winningSegmentIndex = randomIndex;
            data.prizeValue = prize.value;
            data.prizeDescription = prize.description;
            data.balanceAfterWager = parseFloat(ubtBalanceElement.textContent) - wagerAmount;
            data.finalBalance = data.balanceAfterWager + winnings;
        }
        
        return data;
    } catch (error) {
        console.error("API Error (placeBetAndDetermineOutcomeAPI):", error);
        throw error;
    }
}

// --- Game Logic ---

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Spinning wheel page loaded.");
    await displayUBTBalance(); // Load initial balance from server
    createWheelSegments();
    createPrizeLegend();

    if (spinButton) {
        spinButton.addEventListener("click", handleSpin);
    }

    const homeLink = document.querySelector("header nav a[href=\"index.html\"]");
    if (homeLink) {
        homeLink.href = "dashboard.html"; // As per original script
    }
});

function createWheelSegments() {
    const numSegments = prizes.length;
    const segmentAngleDegrees = 360 / numSegments;
    wheelElement.innerHTML = ""; // Clear wheel for fresh segment creation

    prizes.forEach((prize, index) => {
        const segment = document.createElement("div");
        segment.className = "wheel-segment";
        segment.style.backgroundColor = prize.color;
        segment.style.transform = `rotate(${index * segmentAngleDegrees}deg)`;
        
        // No text on the wheel as per requirements
        
        wheelElement.appendChild(segment);
    });
    
    // Add center circle to make wheel look better
    const centerCircle = document.createElement("div");
    centerCircle.className = "wheel-center";
    wheelElement.appendChild(centerCircle);
}

function createPrizeLegend() {
    if (!legendElement) return;
    
    legendElement.innerHTML = "<h3>Prize Legend</h3>";
    
    // Create a unique list of prizes for the legend
    const uniquePrizes = [];
    const addedValues = new Set();
    
    prizes.forEach(prize => {
        if (!addedValues.has(prize.value)) {
            uniquePrizes.push(prize);
            addedValues.add(prize.value);
        }
    });
    
    // Sort by value (highest to lowest)
    uniquePrizes.sort((a, b) => b.value - a.value);
    
    // Create legend items
    uniquePrizes.forEach(prize => {
        const legendItem = document.createElement("div");
        legendItem.className = "legend-item";
        
        const colorBox = document.createElement("span");
        colorBox.className = "color-box";
        colorBox.style.backgroundColor = prize.color;
        
        const description = document.createElement("span");
        description.className = "prize-description";
        description.textContent = prize.description;
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(description);
        legendElement.appendChild(legendItem);
    });
}

async function displayUBTBalance() {
    if (ubtBalanceElement) {
        ubtBalanceElement.textContent = "Loading...";
        try {
            const balance = await fetchUserBalanceAPI();
            ubtBalanceElement.textContent = balance.toFixed(2);
        } catch (error) {
            ubtBalanceElement.textContent = "Error";
            console.error("Failed to display UBT balance:", error.message);
        }
    }
}

async function handleSpin() {
    if (isSpinning) return;

    const wagerAmountElement = document.getElementById("wager-amount");
    const wagerAmount = parseInt(wagerAmountElement.value);

    if (isNaN(wagerAmount) || wagerAmount < 1 || wagerAmount > 100) {
        alert("Please enter a valid wager amount (1-100 UBT).");
        return;
    }

    isSpinning = true;
    spinButton.disabled = true;
    resultMessage.textContent = "Placing bet...";
    winningsAmount.textContent = "0.00";
    newUbtBalanceElement.textContent = "N/A";

    try {
        // Server deducts wager, determines outcome, and returns new balances + winning segment
        const spinOutcome = await placeBetAndDetermineOutcomeAPI(wagerAmount);

        // Update balance display to reflect amount after wager (before win applied)
        ubtBalanceElement.textContent = spinOutcome.balanceAfterWager.toFixed(2);
        resultMessage.textContent = "Spinning...";

        const numSegments = prizes.length;
        const segmentAngle = 360 / numSegments;
        const winningSegmentIndex = spinOutcome.winningSegmentIndex; // Outcome from server

        // Calculate visual rotation
        const totalFullSpins = 4 + Math.floor(Math.random() * 2); // 4-5 full visual spins
        const pointerVisualOffset = segmentAngle / 2; // To center the middle of the segment under the pointer
        const targetRotationValue = (360 * totalFullSpins) - (winningSegmentIndex * segmentAngle) - pointerVisualOffset;
        
        currentRotation = targetRotationValue;
        wheelElement.style.transform = `rotate(${targetRotationValue}deg)`;

        setTimeout(() => {
            isSpinning = false;
            spinButton.disabled = false;
            
            const prizeValue = spinOutcome.prizeValue;
            const prizeDescription = prizes[winningSegmentIndex].description;

            // Calculate winnings based on wager and prize multiplier
            const winnings = wagerAmount * prizeValue;
            
            let displayResultText = "";
            if (prizeValue === 0) {
                displayResultText = "Sorry, you lost!";
            } else {
                displayResultText = `You won ${winnings.toFixed(2)} UBT! (${prizeDescription})`;
            }
            
            resultMessage.textContent = displayResultText;
            winningsAmount.textContent = winnings.toFixed(2);

            // Update balances with final amount from server
            ubtBalanceElement.textContent = spinOutcome.finalBalance.toFixed(2);
            newUbtBalanceElement.textContent = spinOutcome.finalBalance.toFixed(2);

        }, 4100); // Match CSS transition time (4s) + small buffer

    } catch (error) {
        isSpinning = false;
        spinButton.disabled = false;
        resultMessage.textContent = "Spin Failed.";
        alert(`Error: ${error.message}`); // Show error message from API
        await displayUBTBalance(); // Refresh balance from server in case of error
    }
}
