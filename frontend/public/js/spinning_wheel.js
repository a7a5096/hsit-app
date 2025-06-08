// frontend/public/js/spinning_wheel.js
document.addEventListener('DOMContentLoaded', () => {
    // FIX: Correctly get the UBT balance display element by its ID 'ubtBalance'
   const ubtBalanceDisplay = document.getElementById('ubtBalance');
    // const spinCostDisplay = document.getElementById('spinCostDisplay'); // This element is likely no longer needed, can be removed.
    const spinButton = document.getElementById('spinButton');
    const betAmountInput = document.getElementById('betAmountInput'); // Get the new input field
    const wheelElement = document.getElementById('luckyWheel');
    const spinResultPopup = document.getElementById('spinResultPopup');
    const spinResultMessage = document.getElementById('spinResultMessage');
    const closePopupButton = document.getElementById('closePopupButton');

    // COST_PER_SPIN is now dynamic based on user input, so this constant is less critical
    // You might remove it or use it as a fallback/default
    let currentUserUbtBalance = 0;

    const COST_PER_SPIN = 10;
    let currentUserUbtBalance = 0; // Initialize with 0, will be updated by balanceManager

    console.log("Spinning Wheel JS: DOMContentLoaded.");

    if (spinCostDisplay) spinCostDisplay.textContent = COST_PER_SPIN;

    /**
     * Updates the UBT balance display and controls the spin button's disabled state.
     * @param {number} balance - The current UBT balance of the user.
     */

const handleSpin = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please log in to spin.");
            return;
        }

        // Get and validate the bet amount from the input field
        let betAmount = parseFloat(betAmountInput.value);
        if (isNaN(betAmount) || betAmount < 0.5 || betAmount > 10) {
            alert("Please enter a valid bet amount between 0.5 and 10 UBT.");
            spinButton.disabled = false; // Re-enable button
            return;
        }

        // Re-check balance just before initiating spin for robustness
        if (currentUserUbtBalance < betAmount) { // Use betAmount here
            alert(`Not enough UBT. Current balance: ${currentUserUbtBalance.toFixed(2)} UBT. Cost: ${betAmount.toFixed(2)} UBT.`);
            spinButton.disabled = true; // Ensure button remains disabled
            return;
        }

        spinButton.disabled = true;
        spinButton.textContent = "Spinning...";

        const randomSpins = 3 + Math.floor(Math.random() * 3);
        const randomExtraRotation = Math.random() * 360;
        const targetRotation = currentRotation + (randomSpins * 360) + randomExtraRotation;

        console.log('Spinning Wheel JS: Calculating targetRotation:');
        console.log(`  currentRotation: ${currentRotation}`);
        console.log(`  randomSpins * 360: ${randomSpins * 360}`);
        console.log(`  randomExtraRotation: ${randomExtraRotation}`);
        console.log(`  targetRotation: ${targetRotation}`);

        if(wheelElement) {
            wheelElement.style.transition = 'none';
            wheelElement.style.transform = `rotate(${currentRotation % 360}deg)`;
            console.log(`Spinning Wheel JS: Resetting transform to: rotate(${currentRotation % 360}deg)`);

            wheelElement.offsetHeight; // Force reflow

            wheelElement.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
            wheelElement.style.transform = `rotate(${targetRotation}deg)`;
            console.log(`Spinning Wheel JS: Setting final transform to: rotate(${targetRotation}deg)`);
        }
        currentRotation = targetRotation;

        try {
            const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
            const response = await fetch(`${effectiveApiUrl}/api/wheel/spin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ betAmount }) // Send the betAmount to the backend
            });
            const result = await response.json();

            if (!response.ok) {
                const errorMsg = result.message || "Spin failed.";
                console.error("Spin API error:", errorMsg, result);
                throw new Error(errorMsg);
            }

            // ... (rest of your existing success handling for setTimeout) ...
            setTimeout(() => {
                if (spinResultMessage) spinResultMessage.textContent = result.message;
                if (spinResultPopup) spinResultPopup.style.display = 'flex';

                if (result.success && typeof result.newBalance === 'number') {
                    if (typeof balanceManager !== 'undefined') {
                        console.log("Spinning Wheel JS: Spin successful, telling balanceManager to update with new balance:", result.newBalance);
                        balanceManager.updateBalance(result.newBalance);
                    } else {
                        console.error("Spinning Wheel JS: balanceManager not defined after spin!");
                        updateDisplay(currentUserUbtBalance);
                    }
                } else {
                    console.warn("Spinning Wheel JS: Spin response did not have success true or newBalance number.", result);
                    updateDisplay(currentUserUbtBalance);
                }
            }, 4000);

        } catch (error) {
            console.error('Error during spin:', error);
            if (spinResultPopup && spinResultMessage) {
                 spinResultMessage.textContent = `Error: ${error.message}`;
                 spinResultPopup.style.display = 'flex';
            } else {
                alert(`Error: ${error.message}`);
            }

            setTimeout(() => {
                updateDisplay(currentUserUbtBalance);
            }, 4000);
        }
    };
    

    // Listen for balance updates from the balanceManager
    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        console.log(`Spinning Wheel JS: Heard 'balanceUpdated' event! New balance: ${newBalance}`);
        updateDisplay(newBalance); // IMPORTANT: Update the display and button state directly here
    });

    // Listen for balance errors
    document.addEventListener('balanceError', (e) => {
        console.error(`Spinning Wheel JS: Heard 'balanceError' event! Message: ${e.detail.message}`);
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
        if (spinButton) spinButton.disabled = true; // Disable button on error
    });

    let currentRotation = 0;

    const handleSpin = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Using a simple alert for quick feedback, ideally a modal is used.
            alert("Please log in to spin.");
            return;
        }

        // Re-check balance just before initiating spin for robustness
        if (currentUserUbtBalance < COST_PER_SPIN) {
            alert(`Not enough UBT. Current balance: ${currentUserUbtBalance.toFixed(2)} UBT. Cost: ${COST_PER_SPIN} UBT.`);
            spinButton.disabled = true; // Ensure button remains disabled
            return;
        }

        spinButton.disabled = true;
        spinButton.textContent = "Spinning..."; // Provide user feedback

        const randomSpins = 3 + Math.floor(Math.random() * 3);
        const randomExtraRotation = Math.random() * 360;
        const targetRotation = currentRotation + (randomSpins * 360) + randomExtraRotation;

        // Add console logs to debug rotation values
        console.log('Spinning Wheel JS: Calculating targetRotation:');
        console.log(`  currentRotation: ${currentRotation}`);
        console.log(`  randomSpins * 360: ${randomSpins * 360}`);
        console.log(`  randomExtraRotation: ${randomExtraRotation}`);
        console.log(`  targetRotation: ${targetRotation}`);

        if(wheelElement) {
            // Reset transition property first to avoid issues with cumulative transforms
            wheelElement.style.transition = 'none';
            wheelElement.style.transform = `rotate(${currentRotation % 360}deg)`; // Normalize current rotation visually
            console.log(`Spinning Wheel JS: Resetting transform to: rotate(${currentRotation % 360}deg)`);

            // Force reflow
            wheelElement.offsetHeight;

            wheelElement.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
            wheelElement.style.transform = `rotate(${targetRotation}deg)`;
            console.log(`Spinning Wheel JS: Setting final transform to: rotate(${targetRotation}deg)`);
        }
        currentRotation = targetRotation;

        try {
            const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
            const response = await fetch(`${effectiveApiUrl}/api/wheel/spin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            });
            const result = await response.json();

            if (!response.ok) {
                const errorMsg = result.message || "Spin failed.";
                console.error("Spin API error:", errorMsg, result);
                throw new Error(errorMsg);
            }

            // After spin animation completes (roughly 4 seconds)
            setTimeout(() => {
                if (spinResultMessage) spinResultMessage.textContent = result.message;
                if (spinResultPopup) spinResultPopup.style.display = 'flex';

                if (result.success && typeof result.newBalance === 'number') {
                    if (typeof balanceManager !== 'undefined') {
                        console.log("Spinning Wheel JS: Spin successful, telling balanceManager to update with new balance:", result.newBalance);
                        balanceManager.updateBalance(result.newBalance); // This will trigger 'balanceUpdated' and update UI
                    } else {
                        console.error("Spinning Wheel JS: balanceManager not defined after spin!");
                        updateDisplay(currentUserUbtBalance); // Fallback to re-evaluate button state
                    }
                } else {
                    console.warn("Spinning Wheel JS: Spin response did not have success true or newBalance number.", result);
                    updateDisplay(currentUserUbtBalance); // Re-evaluate button state
                }
            }, 4000);

        } catch (error) {
            console.error('Error during spin:', error);
            // Use a modal message instead of alert
            if (spinResultPopup && spinResultMessage) {
                 spinResultMessage.textContent = `Error: ${error.message}`;
                 spinResultPopup.style.display = 'flex';
            } else {
                // Fallback if modal elements aren't ready
                alert(`Error: ${error.message}`);
            }

            setTimeout(() => {
                updateDisplay(currentUserUbtBalance); // Re-evaluate button state
            }, 4000);
        }
    };

    if (spinButton) spinButton.addEventListener('click', handleSpin);
    if (closePopupButton && spinResultPopup) {
        closePopupButton.addEventListener('click', () => {
            spinResultPopup.style.display = 'none';
        });
    }

    // Initial setup: Tell balanceManager to fetch the current balance
    // This will trigger the 'balanceUpdated' event upon success.
    if (typeof balanceManager !== 'undefined') {
        console.log("Spinning Wheel JS: Page loaded, telling balanceManager to initialize.");
        balanceManager.init(); // This call will initiate the balance fetch
    } else {
        console.error("Spinning Wheel JS: balanceManager is not defined!");
        updateDisplay(0); // If balanceManager is missing, display 0 and disable button
    }

    // Initial call to updateDisplay to set button state correctly on page load
    // This will initially disable the button until balanceManager fetches the actual balance
    updateDisplay(currentUserUbtBalance);
});
