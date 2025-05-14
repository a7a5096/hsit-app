// Spinning wheel logic script
const prizes = [
    { text: "10 UBT", color: "#FFC300", value: 10 },
    { text: "Try Again", color: "#C70039", value: 0 },
    { text: "5 UBT", color: "#900C3F", value: 5 },
    { text: "20 UBT", color: "#581845", value: 20 },
    { text: "Bonus Spin", color: "#FF5733", value: "bonus" },
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
    prizes.forEach((prize, index) => {
        const segment = document.createElement("div");
        segment.className = "wheel-segment";
        segment.style.backgroundColor = prize.color;
        // Calculate rotation for each segment to position it correctly
        // Each segment is a 50% width/height div, rotated around its bottom-left corner (transform-origin: 0% 100%)
        // The clip-path creates the wedge shape.
        const rotation = segmentAngle * index;
        segment.style.transform = `rotate(${rotation}deg) skewY(${90 - segmentAngle}deg)`;
        
        const textSpan = document.createElement("span");
        textSpan.textContent = prize.text;
        // Adjust text rotation to be readable
        // This needs careful adjustment based on segmentAngle and skew
        textSpan.style.transform = `skewY(-${90 - segmentAngle}deg) rotate(${segmentAngle / 2}deg) translateY(-50%)`; 
        textSpan.style.position = "absolute";
        textSpan.style.top = "25%"; // Adjust to center text in the visible part of the wedge
        textSpan.style.left = "5%"; // Adjust to position text within the wedge
        textSpan.style.textAlign = "center";
        textSpan.style.width = "90%";
        textSpan.style.color = isLight(prize.color) ? "#333" : "#fff"; // Make text readable on segment color

        segment.appendChild(textSpan);
        wheelElement.appendChild(segment);
    });
}

// Helper function to determine if a color is light or dark
function isLight(color) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155; // Threshold for brightness
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
    if(winningsAmount) winningsAmount.textContent = "0";
    if(newUbtBalanceElement) newUbtBalanceElement.textContent = "N/A";

    // Deduct wager from balance before spin (optimistic update, or wait for server confirmation in real app)
    userData.balances.ubt -= wagerAmount;
    localStorage.setItem("userData", JSON.stringify(userData));
    displayUBTBalance();

    const totalSpins = 3 + Math.floor(Math.random() * 3); // Number of full rotations
    const winningSegmentIndex = Math.floor(Math.random() * prizes.length);
    const segmentAngle = 360 / prizes.length;
    // Calculate rotation to land on the middle of the winning segment
    // The pointer is at the top (0 degrees). Segments are laid out clockwise.
    // To land on segment `i`, the wheel needs to rotate so that the start of segment `i` is at `-(i * segmentAngle)`
    // and the middle of the segment is at `-(i * segmentAngle + segmentAngle / 2)`
    const targetRotation = (360 * totalSpins) - (winningSegmentIndex * segmentAngle + segmentAngle / 2);
    
    currentRotation = targetRotation;
    wheelElement.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        spinButton.disabled = false;
        const winningPrize = prizes[winningSegmentIndex];
        
        if(resultMessage) resultMessage.textContent = `You won: ${winningPrize.text}!`;
        let actualWinnings = 0;
        if (typeof winningPrize.value === "number") {
            actualWinnings = winningPrize.value * (wagerAmount / 10); // Scale winnings by wager (example logic)
        } else if (winningPrize.value === "bonus") {
            actualWinnings = 0; // Or trigger a bonus spin
            alert("Bonus Spin! Feature not yet implemented.");
        }
        if(winningsAmount) winningsAmount.textContent = actualWinnings.toFixed(2);

        userData.balances.ubt += actualWinnings;
        localStorage.setItem("userData", JSON.stringify(userData));
        displayUBTBalance();
        if(newUbtBalanceElement) newUbtBalanceElement.textContent = userData.balances.ubt.toFixed(2);

    }, 4100); // Match CSS transition duration + a small buffer
}

