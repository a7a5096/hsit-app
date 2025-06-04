// frontend/public/js/spinning_wheel.js
document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    const wheelElement = document.getElementById('wheel'); // The main wheel div
    const resultMessage = document.getElementById('result-message');
    const winningsAmountDisplay = document.getElementById('winningsAmount');
    const newUbtBalanceDisplay = document.getElementById('newUbtBalance'); // Displays balance after spin result
    const spinError = document.getElementById('spinError');

    const COST_PER_SPIN = 10; 
    let currentUserUbtBalance = 0; // Local cache of balance

    console.log("Spinning Wheel JS: DOMContentLoaded.");

    if (spinCostDisplay) {
        spinCostDisplay.textContent = COST_PER_SPIN;
    }

    // Listen for global balance updates from balanceManager
    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        console.log(`Spinning Wheel JS: 'balanceUpdated' event received! New balance: ${newBalance}`);
        currentUserUbtBalance = newBalance;
        
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = newBalance.toFixed(2);
        // newUbtBalanceDisplay is for post-spin result, so we don't update it here directly from global event
        // It will be updated after a spin result specifically.
        
        if (spinButton) {
            spinButton.disabled = !localStorage.getItem('token') || newBalance < COST_PER_SPIN;
        }
    });

    // Listen for balance errors from balanceManager
    document.addEventListener('balanceError', (e) => {
        console.error(`Spinning Wheel JS: 'balanceError' event received! Message: ${e.detail.message}`);
        showSpinError(e.detail.message || "Could not load your UBT balance.");
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = "Error"; // Show error here too
        if (spinButton) spinButton.disabled = true;
    });

    function showSpinError(message) {
        if (spinError) {
            spinError.textContent = message;
            spinError.style.display = 'block';
        }
         if (resultMessage) resultMessage.textContent = ''; // Clear result on new error
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
    }
    
    function clearSpinMessages() {
        if (spinError) spinError.style.display = 'none';
        if (resultMessage) resultMessage.textContent = '';
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
        // Don't clear newUbtBalanceDisplay here, it reflects current state or last spin.
    }

    let currentRotation = 0;

    function animateWheel() {
        if (wheelElement) {
            wheelElement.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
            const randomSpins = 3 + Math.floor(Math.random() * 3);
            const randomExtraRotation = Math.random() * 360; // Spin to a random degree
            const targetRotation = currentRotation + (randomSpins * 360) + randomExtraRotation;
            
            wheelElement.style.transform = `rotate(${targetRotation}deg)`;
            currentRotation = targetRotation; // Update for next spin calculation
        }
    }

    async function handleSpin() {
        const token = localStorage.getItem('token'); // Get fresh token
        if (!token) {
            showSpinError("Please log in to spin.");
            return;
        }
        
        clearSpinMessages();

        if (currentUserUbtBalance < COST_PER_SPIN) {
            showSpinError(`Not enough UBT. Cost is ${COST_PER_SPIN} UBT.`);
            return;
        }

        if (spinButton) spinButton.disabled = true;
        if (resultMessage) resultMessage.textContent = "Spinning...";
        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = "Spinning..."; // Indicate change pending
        
        animateWheel();

        try {
            const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
            
            const response = await fetch(`${effectiveApiUrl}/api/wheel/spin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                }
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Spin failed due to a server error.");
            }

            // Let the visual spin animation (3s) complete before showing results
            setTimeout(() => {
                if (result.success) {
                    if (resultMessage) resultMessage.textContent = result.message;
                    if (winningsAmountDisplay) winningsAmountDisplay.textContent = result.prizeAmount || 0;

                    // IMPORTANT: Use balanceManager to update the global balance
                    if (typeof result.newBalance === 'number') {
                        balanceManager.updateBalance(result.newBalance); // This will trigger 'balanceUpdated'
                        // The 'balanceUpdated' listener above will update ubtBalanceDisplay.
                        // We also update the specific newUbtBalanceDisplay for post-spin context.
                        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = result.newBalance.toFixed(2);
                    }
                    
                    // The 'balanceUpdated' event listener will handle re-evaluating spinButton.disabled
                    // based on the new currentUserUbtBalance.
                    // If it's a "Spin Again" prize where cost was refunded, balance might still be sufficient.

                } else { // result.success is false
                    showSpinError(result.message || "Spin was not successful.");
                    // Re-fetch balance in case of server-side error that might not have updated client balance
                    if (localStorage.getItem('token')) balanceManager.fetchBalance();
                }
            }, 3000); // Delay matches CSS animation

        } catch (error) {
            console.error('Error during spin:', error);
            showSpinError(error.message);
            // Re-enable button after error and animation time
            setTimeout(() => {
                if (spinButton && localStorage.getItem('token')) { // Only enable if still logged in
                     spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
                } else if (spinButton) {
                    spinButton.disabled = true; // Ensure disabled if no token
                }
            }, 3000);
        }
    }

    if (spinButton) {
        spinButton.addEventListener('click', handleSpin);
    }

    // Initial call to balanceManager to fetch balance if user is already logged in or on page load
    if (typeof balanceManager !== 'undefined') {
        console.log("Spinning Wheel JS: Page loaded, calling balanceManager.init().");
        balanceManager.init(); // balanceManager will check for token internally
    } else {
        console.error("Spinning Wheel JS: balanceManager is not defined!");
        showSpinError("Balance system error. Please refresh.");
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = "Error";
        if (spinButton) spinButton.disabled = true;
    }
});
