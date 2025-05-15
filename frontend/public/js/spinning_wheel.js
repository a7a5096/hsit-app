// spinning_wheel.js

const prizes = [
    { text: "10 UBT", color: "#FFC300", value: 10 },
    { text: "Try Again", color: "#C70039", value: 0 },
    { text: "5 UBT", color: "#900C3F", value: 5 },
    { text: "20 UBT", color: "#581845", value: 20 },
    { text: "Bonus Spin", color: "#FF5733", value: "bonus" }, // UNCOMMENTED for 8 segments
    { text: "2 UBT", color: "#DAF7A6", value: 2 },
    { text: "50 UBT", color: "#3498DB", value: 50 },
    { text: "Jackpot!", color: "#2ECC71", value: 100 }
];

const wheelElement = document.getElementById("wheel");
const spinButton = document.getElementById("spin-button");
const resultMessage = document.getElementById("result-message");
const winningsAmount = document.getElementById("winnings-amount");
const newUbtBalanceElement = document.getElementById("new-ubt-balance");
const ubtBalanceElement = document.getElementById("ubt-balance"); // Added for convenience

let isSpinning = false;
let currentRotation = 0;

// --- API Interaction Functions (Hypothetical Backend) ---
const API_BASE_URL = "/api/ubt"; // Example: Adjust to your actual API base URL

async function fetchUserBalanceAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/balance`); // GET request
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
        const response = await fetch(`${API_BASE_URL}/spin`, { // POST request
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wager: wagerAmount })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status}` }));
            throw new Error(errorData.message || `Failed to place bet.`);
        }
        const data = await response.json();
        // Expects e.g.:
        // {
        //   "winningSegmentIndex": 3,
        //   "prizeText": "20 UBT",
        //   "prizeValue": 20,
        //   "balanceAfterWager": 82.67, (balance after wager, before win)
        //   "finalBalance": 102.67       (balance after win is applied)
        // }
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

        const textSpan = document.createElement("span");
        textSpan.textContent = prize.text;
        textSpan.style.color = isLight(prize.color) ? "#111111" : "#FFFFFF";

        // Improved text styling:
        // Leverage CSS for base (font-size, weight via .wheel-segment span)
        // JS provides dynamic rotation and precise positioning.
        textSpan.style.position = "absolute";
        textSpan.style.top = "50%";
        // Start text further from the center. 10-15% of segment width (which is 50% of wheel diameter)
        // Effectively 5-7.5% of wheel diameter from the center point.
        textSpan.style.left = "12%"; // Pushes text start point further from center than "5px"
        textSpan.style.width = "auto"; // Let text define its own width to prevent premature wrap
        textSpan.style.whiteSpace = "nowrap"; // Ensure text stays on one line
        textSpan.style.textAlign = "left"; // Align text from the starting point
        textSpan.style.transformOrigin = "0% 50%"; // Rotate around the (new) left-center of the text span

        const textVisualRotation = (segmentAngleDegrees / 2) + 90; // To make text perpendicular to segment's radial center
        textSpan.style.transform = `translateY(-50%) rotate(${textVisualRotation}deg)`;
        
        segment.appendChild(textSpan);
        wheelElement.appendChild(segment);
    });
}

function isLight(color) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155; // Slightly adjusted threshold for very dark colors
}

async function displayUBTBalance() {
    if (ubtBalanceElement) {
        ubtBalanceElement.textContent = "Loading...";
        try {
            const balance = await fetchUserBalanceAPI();
            ubtBalanceElement.textContent = balance.toFixed(2);
        } catch (error) {
            ubtBalanceElement.textContent = "Error";
            // Optionally, display error.message to the user in a more friendly way
            console.error("Failed to display UBT balance:", error.message);
        }
    }
}

async function handleSpin() {
    if (isSpinning) return;

    const wagerAmountElement = document.getElementById("wager-amount");
    const wagerAmount = parseInt(wagerAmountElement.value);

    if (isNaN(wagerAmount) || wagerAmount < 1 || wagerAmount > 100) { // Validate against min/max too
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
        
        currentRotation = targetRotationValue; // Though currentRotation isn't strictly used after this set
        wheelElement.style.transform = `rotate(${targetRotationValue}deg)`;

        setTimeout(() => {
            isSpinning = false;
            spinButton.disabled = false;
            
            const prizeWonText = spinOutcome.prizeText;
            const prizeWonValue = spinOutcome.prizeValue; // This is the actual value/multiplier of the prize

            let displayWinnings = 0;
            let displayResultText = "";

            if (prizeWonValue === "bonus") {
                displayResultText = "Bonus Spin!"; // Server should handle bonus logic
                // Winnings for a "bonus" outcome might be 0 or a fixed amount, determined by server
                // For now, assume 0 direct UBT winnings from "bonus" segment itself
                alert("You won a Bonus Spin! (Feature to be implemented by server)");
            } else if (typeof prizeWonValue === 'number') {
                displayWinnings = prizeWonValue; // The prize array value is the direct UBT amount
                displayResultText = `You won: ${displayWinnings.toFixed(2)} UBT!`;
            } else { // e.g. "Try Again"
                displayResultText = prizeWonText;
            }
            
            resultMessage.textContent = displayResultText;
            winningsAmount.textContent = displayWinnings.toFixed(2);

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