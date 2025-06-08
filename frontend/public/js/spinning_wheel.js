// frontend/public/js/spinning_wheel.js
document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalance');
    const spinButton = document.getElementById('spinButton');
    const betAmountInput = document.getElementById('betAmountInput');
    const wheelElement = document.getElementById('luckyWheel');
    const spinResultPopup = document.getElementById('spinResultPopup');
    const spinResultMessage = document.getElementById('spinResultMessage');
    const closePopupButton = document.getElementById('closePopupButton');
    const ctx = wheelElement.getContext('2d');

    let currentRotation = 0;
    let currentUserUbtBalance = 0;
    let isSpinning = false;

    // Wheel segment data (matching backend probabilities)
    const segments = [
        { name: 'Black', color: 'black', probability: 0.4, display: '0x Bet' },
        { name: 'Blue', color: 'blue', probability: 0.2, display: '1x Bet' },
        { name: 'White', color: 'white', probability: 0.2, display: '5x Bet' },
        { name: 'Red', color: 'red', probability: 0.19, display: '10x Bet' },
        { name: 'GOLD', color: 'gold', probability: 0.01, display: 'UBT Bot #5' }
    ];

    // Function to draw the wheel
    function drawWheel() {
        if (!wheelElement) return;

        const canvasWidth = wheelElement.width;
        const canvasHeight = wheelElement.height;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const radius = Math.min(centerX, centerY) * 0.9;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        let startAngle = 0;
        segments.forEach(segment => {
            const angle = 2 * Math.PI * segment.probability;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
            ctx.lineTo(centerX, centerY);
            ctx.fillStyle = segment.color;
            ctx.fill();
            ctx.closePath();

            // Draw segment text (name and multiplier/display)
            ctx.fillStyle = segment.color === 'white' || segment.color === 'gold' ? 'black' : 'white';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';

            // Position for the segment name
            const nameTextX = centerX + Math.cos(startAngle + angle / 2) * (radius * 0.5);
            const nameTextY = centerY + Math.sin(startAngle + angle / 2) * (radius * 0.5) - 10;

            // Position for the multiplier/display text
            const displayX = centerX + Math.cos(startAngle + angle / 2) * (radius * 0.7);
            const displayY = centerY + Math.sin(startAngle + angle / 2) * (radius * 0.7) + 10;

            ctx.fillText(segment.name, nameTextX, nameTextY);
            ctx.fillText(segment.display, displayX, displayY);

            startAngle += angle;
        });

        // Draw pointer (you can customize this)
        ctx.beginPath();
        ctx.moveTo(centerX + radius * 1.1, centerY);
        ctx.lineTo(centerX + radius * 1.2, centerY - 10);
        ctx.lineTo(centerX + radius * 1.2, centerY + 10);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.closePath();
    }

    // Function to handle the spin animation
    const handleSpin = async () => {
        if (isSpinning) return;
        isSpinning = true;

        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please log in to spin.");
            isSpinning = false;
            return;
        }

        let betAmount = parseFloat(betAmountInput.value);
        if (isNaN(betAmount) || betAmount < 0.5 || betAmount > 10) {
            alert("Please enter a valid bet amount between 0.5 and 10 UBT.");
            isSpinning = false;
            return;
        }

        if (currentUserUbtBalance < betAmount) {
            alert(`Not enough UBT. Current balance: ${currentUserUbtBalance.toFixed(2)} UBT. Cost: ${betAmount.toFixed(2)} UBT.`);
            isSpinning = false;
            return;
        }

        spinButton.disabled = true;
        spinButton.textContent = "Spinning...";

        const randomSpins = 3 + Math.floor(Math.random() * 3);
        const randomExtraRotation = Math.random() * 360;
        const targetRotation = currentRotation + (randomSpins * 360) + randomExtraRotation;

        wheelElement.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
        wheelElement.style.transform = `rotate(${targetRotation}deg)`;
        currentRotation = targetRotation;

        try {
            const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
            const response = await fetch(`${effectiveApiUrl}/api/wheel/spin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ betAmount })
            });
            const result = await response.json();

            if (!response.ok) {
                const errorMsg = result.message || "Spin failed.";
                console.error("Spin API error:", errorMsg, result);
                throw new Error(errorMsg);
            }

            setTimeout(() => {
                if (spinResultMessage) spinResultMessage.textContent = result.message;
                if (spinResultPopup) spinResultPopup.style.display = 'flex';

                if (result.success && typeof result.newBalance === 'number') {
                    if (typeof balanceManager !== 'undefined') {
                        balanceManager.updateBalance(result.newBalance);
                    } else {
                        console.error("balanceManager not defined after spin!");
                        updateDisplay(currentUserUbtBalance);
                    }
                } else {
                    console.warn("Spin response did not have success true or newBalance number.", result);
                    updateDisplay(currentUserUbtBalance);
                }
                isSpinning = false;
                spinButton.disabled = false;
                spinButton.textContent = "Spin Now";
            }, 4000);

        } catch (error) {
            console.error('Error during spin:', error);
            if (spinResultPopup && spinResultMessage) {
                spinResultMessage.textContent = `Error: ${error.message}`;
                spinResultPopup.style.display = 'flex';
            } else {
                alert(`Error: ${error.message}`);
            }
            isSpinning = false;
            spinButton.disabled = false;
            spinButton.textContent = "Spin Now";
        }
    };

    function updateDisplay(balance) {
        currentUserUbtBalance = balance;
        if (ubtBalanceDisplay) {
            ubtBalanceDisplay.textContent = balance.toFixed(2);
        }

        if (spinButton) {
            const hasToken = !!localStorage.getItem('token');
            const currentBet = betAmountInput ? parseFloat(betAmountInput.value) : 10;
            const canAfford = currentUserUbtBalance >= currentBet;

            spinButton.disabled = !hasToken || !canAfford || isSpinning;
            spinButton.textContent = isSpinning ? "Spinning..." : hasToken ? (canAfford ? `Spin (${currentBet.toFixed(2)} UBT)` : `Insufficient UBT (Bet: ${currentBet.toFixed(2)})`) : "Log In to Spin";
        }
    }

    // Event listeners
    if (spinButton) {
        spinButton.addEventListener('click', handleSpin);
    }

    // Initial draw of the wheel
    drawWheel();

    // Initial setup: Tell balanceManager to fetch the current balance
    // This will trigger the 'balanceUpdated' event upon success.
    if (typeof balanceManager !== 'undefined') {
        balanceManager.init();
    } else {
        console.error("balanceManager is not defined!");
        updateDisplay(0);
    }
    updateDisplay(currentUserUbtBalance);
});
