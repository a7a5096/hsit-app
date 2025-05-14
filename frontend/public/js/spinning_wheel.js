// Spinning wheel logic script
const prizes = [
    { text: "10 UBT", color: "#FFC300", value: 10 },
    { text: "Try Again", color: "#C70039", value: 0 },
    { text: "5 UBT", color: "#900C3F", value: 5 },
    { text: "20 UBT", color: "#581845", value: 20 },
    // { text: "Bonus Spin", color: "#FF5733", value: "bonus" }, // Removed Bonus Spin
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
    const numSegments = prizes.length;
    const segmentAngleDegrees = 360 / numSegments;
    wheelElement.innerHTML = ""; // Clear the wheel first
    prizes.forEach((prize, index) => {
        const segment = document.createElement("div");
        segment.className = "wheel-segment";
        segment.style.backgroundColor = prize.color;
        // Rotate the segment container
        segment.style.transform = `rotate(${index * segmentAngleDegrees}deg)`;
        // Use clip-path to create the wedge shape for each segment
        // This requires calculating points for a polygon
        // For 8 segments, each segment is 45 degrees.
        // Clip-path: polygon(center_x center_y, point1_x point1_y, point2_x point2_y)
        // Using a simpler approach with skewed divs was problematic for text.
        // Let's use a common technique: create a div for each segment, rotate it, and place text inside.
        // The CSS already has .wheel-segment with transform-origin: 0% 100%; (center of wheel)
        // and width: 50%, height: 50%.
        // The text element needs to be positioned and rotated carefully.

        const textSpan = document.createElement("span");
        textSpan.textContent = prize.text;
        textSpan.style.color = isLight(prize.color) ? "#111111" : "#FFFFFF"; // Ensure high contrast
        // Position text within the segment. This is tricky due to segment rotation.
        // We want text to appear radially, but upright.
        // Let's position text absolutely within the segment, then rotate the text itself.
        // The segment is already rotated. Text needs to be placed towards the outer edge.
        textSpan.style.transform = `translate(-50%, -50%) rotate(${segmentAngleDegrees / 1.5}deg)`;
        // The above transform for text was part of the old jumbled approach.
        // New approach for text: Position it within the segment div, then rotate the segment div.
        // The CSS for .wheel-segment span will handle the base styling.
        // The JS will set the rotation for the text to be upright relative to the user.
        // Each segment is a 50%x50% div, rotated from the center (0,100) of its own coordinate system.
        // The text needs to be placed within this 50x50 box, then the whole box is rotated.
        // The text itself should be rotated to be upright.
        // The segment is rotated by (index * segmentAngleDegrees). Text needs to counter-rotate this, plus align radially.
        
        // Resetting text transform and relying on CSS, then adjusting
        textSpan.style.transform = `rotate(${segmentAngleDegrees / 2}deg) translate(60px)`; // Move text outward, rotate to align with segment center
        // The CSS for .wheel-segment span already has some transform. Let JS control it fully for clarity.
        // textSpan.style.transform = `translate(70px, 0) rotate(90deg)`; // Example: move out, then rotate to be perpendicular
        // This needs to be dynamic based on segmentAngleDegrees
        const textRotation = - (index * segmentAngleDegrees) - (segmentAngleDegrees / 2) + 90;
        // textSpan.style.transform = `rotate(${textRotation}deg) translateX(60px) rotate(-90deg)`;
        // The CSS has: transform: rotate(45deg); padding-left: 20px;
        // Let's simplify: position text, then rotate the segment. Text will rotate with segment.
        // Then, counter-rotate the text span itself.
        segment.style.transform = `rotate(${index * segmentAngleDegrees}deg)`;
        textSpan.style.transform = `translateY(25%) rotate(${segmentAngleDegrees / 2}deg)`; // Position text within segment, then rotate it slightly

        // Final attempt at text orientation for clarity:
        // The segment is rotated. Text is a child. We need to position text near the outer edge of the segment
        // and rotate it so it's upright and readable.
        const textAngle = segmentAngleDegrees / 2; // Angle for the radial line in the middle of the segment
        textSpan.style.position = "absolute";
        textSpan.style.top = "50%"; // Vertically center the text's transform origin
        textSpan.style.left = "5px";  // Start text 5px from the segment's origin (which is the wheel's center)
        textSpan.style.transformOrigin = "left center"; // Rotate around the starting point (left) of the text, vertically centered
        textSpan.style.transform = `translateY(-50%) rotate(${textAngle + 90}deg)`;
        // translateY(-50%) to vertically center the text line itself around its 'top: 50%' position.
        // rotate(textAngle + 90deg): textAngle aligns with segment radial center, +90 makes it perpendicular.
        textSpan.style.textAlign = "left"; // Text flows from the left.
        textSpan.style.width = "auto"; // Let the text define its width.
        textSpan.style.whiteSpace = "nowrap"; // Prevent wrapping.

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
    return brightness > 150; // Adjusted threshold for better contrast, ensure text is visible
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
    // Adjust targetRotation to align the center of the segment with the pointer (top)
    const pointerOffset = segmentAngle / 2; // To center the segment under the pointer
    const targetRotation = (360 * totalSpins) - (winningSegmentIndex * segmentAngle) - pointerOffset;
    
    currentRotation = targetRotation;
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
            actualWinnings = winningPrize.value;
            resultText = `You won: ${actualWinnings.toFixed(2)} UBT!`;
        } else { 
            actualWinnings = 0;
            resultText = winningPrize.text; 
        }
        
        if(resultMessage) resultMessage.textContent = resultText;
        if(winningsAmount) winningsAmount.textContent = actualWinnings.toFixed(2);

        userData.balances.ubt += actualWinnings;
        localStorage.setItem("userData", JSON.stringify(userData));
        displayUBTBalance();
        if(newUbtBalanceElement) newUbtBalanceElement.textContent = userData.balances.ubt.toFixed(2);

    }, 4100); 
}

