// Spinning wheel logic script
const prizes = [
    { text: "10 UBT", color: "#FFC300", value: 10 },
    { text: "Try Again", color: "#C70039", value: 0 },
    { text: "5 UBT", color: "#900C3F", value: 5 },
    { text: "20 UBT", color: "#581845", value: 20 },
    { text: "Bonus Spin", color: "#FF5733", value: "bonus" }, // Keep as string for special handling
    { text: "2 UBT", color: "#DAF7A6", value: 2 },
    { text: "50 UBT", color: "#3498DB", value: 50 },
    { text: "Jackpot!", color: "#2ECC71", value: 100 } 
];

const wheelElement = document.getElementById("wheel");
const spinButton = document.getElementById("spin-button");
const resultMessage = document.getElementById("result-message");
const winningsAmount = document.getElementById("winnings-amount");
const newUbtBalanceElement = document.getElementById("new-ubt-balance");

let isSpinning = false;
let currentRotation = 0;

document.addEventListener("DOMContentLoaded", () => {
    console.log("Spinning wheel page loaded.");
    displayUBTBalance();
    createWheelSegments();

    if (spinButton) {
        spinButton.addEventListener("click", handleSpin);
    }

    const homeLink = document.querySelector("header nav a[href=\"index.html\"]");
    if (homeLink) {
        homeLink.href = "dashboard.html";
    }
});

function createWheelSegments() {
    const segmentAngle = 360 / prizes.length;
    wheelElement.innerHTML = ''; // Clear previous segments if any

    prizes.forEach((prize, index) => {
        const segment = document.createElement("div");
        segment.className = "wheel-segment";
        segment.style.backgroundColor = prize.color;
        
        // Rotate the segment itself. Origin is center of the wheel.
        // Each segment is a wedge.
        const segmentRotation = segmentAngle * index;
        segment.style.transform = `rotate(${segmentRotation}deg)`;
        segment.style.clipPath = `polygon(50% 50%, 100% 0, 100% 100%)`; // Default for first segment, needs adjustment
        // A more robust way for clip-path for a wedge from center:
        // clip-path: polygon(50% 50%, X1 Y1, X2 Y2)
        // X1,Y1 is one point on circumference, X2,Y2 is another point on circumference
        // For simplicity with CSS transforms, we'll use a different approach: create full circle segments and clip them.
        // Or, use ::before pseudo-elements for segments if pure CSS is desired for segments.
        // The current JS approach uses divs for segments, rotated and skewed.
        // Let's simplify the transform for the segment container and focus on text.
        // The segment div itself will be a slice.

        // Simplified segment creation using a transform on the segment div
        // The segment div is a rectangle, we make it a wedge using clip-path or by rotating a skewed div.
        // The previous method: segment.style.transform = `rotate(${rotation}deg) skewY(${90 - segmentAngle}deg)`;
        // This creates a skewed div. Text inside also gets skewed.
        // Let's try to make the segment a proper wedge and place text carefully.

        // New approach for segment creation: Each segment is a div, rotated.
        // Text is a child, counter-rotated and positioned.
        segment.style.transform = `rotate(${segmentAngle * index}deg)`;
        segment.style.width = "50%";
        segment.style.height = "50%";
        segment.style.position = "absolute";
        segment.style.top = "0";
        segment.style.left = "50%";
        segment.style.transformOrigin = "0% 100%"; // Pivot from wheel center
        segment.style.clipPath = `polygon(0% 0%, 100% 0%, 0% 100%)`; // Creates a triangle
        // This clip-path is for a div whose top-left is at the center of the wheel.
        // We need to adjust the clip-path based on the segmentAngle.
        const angleRad = (segmentAngle * Math.PI) / 180;
        const xPos = Math.tan(angleRad / 2) * 100; // Percentage for clip-path
        segment.style.clipPath = `polygon(0% 0%, ${xPos}% 0%, 0% 100%)`;
        // This is still complex. Let's revert to a simpler skew and focus on text.
        segment.style.transform = `rotate(${segmentAngle * index}deg) skewY(${Math.max(0, 90 - segmentAngle)}deg)`;


        const textSpan = document.createElement("span");
        textSpan.textContent = prize.text;
        // Counter-skew and counter-rotate text
        textSpan.style.display = "block";
        textSpan.style.position = "absolute";
        textSpan.style.left = "50%"; // Center horizontally in the segment's original rectangle
        textSpan.style.top = "20%";  // Position vertically
        textSpan.style.transformOrigin = "center center";
        textSpan.style.textAlign = "center";
        textSpan.style.color = isLight(prize.color) ? "#222" : "#fff"; // Darker black for light backgrounds
        textSpan.style.fontWeight = "bold";
        textSpan.style.fontSize = "12px"; // Adjust as needed
        // The text needs to be rotated to align with the segment's radial direction, then made upright.
        // Rotate text to be radial, then counter-rotate the segment's skew.
        textSpan.style.transform = `skewY(-${Math.max(0, 90 - segmentAngle)}deg) rotate(${segmentAngle / 2 - 90}deg) translateX(-50%)`;
        // The translateX(-50%) is to re-center after positioning left: 50%.
        // This text transformation is the trickiest part.

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
    return brightness > 140; // Adjusted threshold for better contrast
}

function displayUBTBalance() {
    const ubtBalanceElement = document.getElementById("ubt-balance");
    if (ubtBalanceElement) {
        try {
            const userDataString = localStorage.getItem("userData");
            if (userDataString) {
                const userData = JSON.parse(userDataString);
                if (userData && userData.balances && typeof userData.balances.ubt !== "undefined") {
                    ubtBalanceElement.textContent = userData.balances.ubt.toFixed(2);
                } else {
                    ubtBalanceElement.textContent = "N/A";
                }
            } else {
                ubtBalanceElement.textContent = "N/A";
            }
        } catch (error) {
            ubtBalanceElement.textContent = "Error";
            console.error("Error displaying UBT balance:", error);
        }
    }
}

function handleSpin() {
    if (isSpinning) return;

    const wagerAmountElement = document.getElementById("wager-amount");
    const wagerAmount = parseInt(wagerAmountElement.value);

    if (isNaN(wagerAmount) || wagerAmount <= 0) {
        alert("Please enter a valid wager amount.");
        return;
    }

    const userDataString = localStorage.getItem("userData");
    if (!userDataString) {
        alert("Please log in to play.");
        return;
    }
    const userData = JSON.parse(userDataString);
    if (userData.balances.ubt < wagerAmount) {
        alert("Insufficient UBT balance for this wager.");
        return;
    }

    isSpinning = true;
    spinButton.disabled = true;
    if(resultMessage) resultMessage.textContent = "Spinning...";
    if(winningsAmount) winningsAmount.textContent = "0.00";
    if(newUbtBalanceElement) newUbtBalanceElement.textContent = "N/A";

    userData.balances.ubt -= wagerAmount;
    localStorage.setItem("userData", JSON.stringify(userData));
    displayUBTBalance();

    const totalSpins = 4 + Math.floor(Math.random() * 3);
    const winningSegmentIndex = Math.floor(Math.random() * prizes.length);
    const segmentAngle = 360 / prizes.length;
    const targetRotation = (360 * totalSpins) - (winningSegmentIndex * segmentAngle + segmentAngle / 2);
    
    currentRotation = targetRotation;
    // Ensure the wheel resets its rotation before applying the new one for a clean spin effect
    // wheelElement.style.transition = 'none'; // Disable transition for reset
    // wheelElement.style.transform = `rotate(${currentRotation % 360}deg)`; // Reset to a start point if needed
    // requestAnimationFrame(() => { // Ensure reset is painted
    //    wheelElement.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)'; // Re-enable transition
    //    wheelElement.style.transform = `rotate(${currentRotation}deg)`;
    // });
    // Simpler: just set the new rotation, CSS transition handles it.
    wheelElement.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        spinButton.disabled = false;
        const winningPrize = prizes[winningSegmentIndex];
        
        let actualWinnings = 0;
        let resultText = "";

        if (winningPrize.value === "bonus") {
            actualWinnings = 0; 
            resultText = "Bonus Spin!";
            alert("Bonus Spin! Feature not yet implemented."); 
        } else if (typeof winningPrize.value === "number") {
            // Winnings are the direct value from the prize, wager is the cost to play.
            actualWinnings = winningPrize.value;
            resultText = `You won: ${actualWinnings.toFixed(2)} UBT!`;
        } else { // Includes "Try Again" or other non-numeric values that aren't 'bonus'
            actualWinnings = 0;
            resultText = winningPrize.text; // e.g., "Try Again"
        }
        
        if(resultMessage) resultMessage.textContent = resultText;
        if(winningsAmount) winningsAmount.textContent = actualWinnings.toFixed(2);

        userData.balances.ubt += actualWinnings; // Add winnings to balance (wager already deducted)
        localStorage.setItem("userData", JSON.stringify(userData));
        displayUBTBalance();
        if(newUbtBalanceElement) newUbtBalanceElement.textContent = userData.balances.ubt.toFixed(2);

    }, 4100); 
}

