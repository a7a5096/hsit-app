document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    const wheelElement = document.getElementById('wheel');
    const resultMessage = document.getElementById('result-message');
    const winningsAmountDisplay = document.getElementById('winningsAmount');
    const newUbtBalanceDisplay = document.getElementById('newUbtBalance');
    const spinError = document.getElementById('spinError');

    const token = localStorage.getItem('token');
    const COST_PER_SPIN = 10;
    let currentUserUbtBalance = 0;

    if (spinCostDisplay) {
        spinCostDisplay.textContent = COST_PER_SPIN;
    }

    // Listen for global balance updates
    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        currentUserUbtBalance = newBalance;
        
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = newBalance.toFixed(2);
        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = newBalance.toFixed(2); // Keep this if you have a "new balance after win" display
        
        if (spinButton) {
            spinButton.disabled = !token || newBalance < COST_PER_SPIN;
        }
    });

    // Listen for balance errors
    document.addEventListener('balanceError', (e) => {
        showSpinError(e.detail.message || "Could not load your UBT balance.");
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = "Error";
        if (spinButton) spinButton.disabled = true;
    });

    function showSpinError(message) {
        if (spinError) {
            spinError.textContent = message;
            spinError.style.display = 'block';
        }
    }
    
    function clearSpinMessages() {
        if (spinError) spinError.style.display = 'none';
        if (resultMessage) resultMessage.textContent = '';
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
        // Keep newUbtBalanceDisplay showing the current balance
    }

    let currentRotation = 0;

    function animateWheel() {
        if (wheelElement) {
            wheelElement.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
            const randomSpins = 3 + Math.floor(Math.random() * 3);
            const randomExtraRotation = Math.random() * 360;
            const targetRotation = currentRotation + (randomSpins * 360) + randomExtraRotation;
            
            wheelElement.style.transform = `rotate(${targetRotation}deg)`;
            currentRotation = targetRotation;
        }
    }

    async function handleSpin() {
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
        
        animateWheel();

        try {
            // Ensure API_URL is defined
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

            // Let the animation play out
            setTimeout(() => {
                if (result.success) {
                    if (resultMessage) resultMessage.textContent = result.message;
                    if (winningsAmountDisplay) winningsAmountDisplay.textContent = result.prizeAmount || 0;

                    // IMPORTANT: Use balanceManager to update the balance
                    if (typeof result.newBalance === 'number') {
                        balanceManager.updateBalance(result.newBalance); // This will trigger the 'balanceUpdated' event
                    }
                    
                    if (result.isSpinAgain) {
                        if (spinButton) spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN; // Re-enable based on current balance
                    } else {
                        // For other prizes, re-enable based on current balance
                         if (spinButton) spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
                    }
                } else {
                    showSpinError(result.message || "Spin was not successful.");
                    if (spinButton) spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
                }
            }, 3000); // Match CSS transition duration for spinning

        } catch (error) {
            console.error('Error during spin:', error);
            showSpinError(error.message);
            setTimeout(() => {
                // Re-enable based on current balance after an error
                if (spinButton) spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
            }, 3000);
        }
    }

    if (spinButton) {
        spinButton.addEventListener('click', handleSpin);
    }

    // Request initial balance update from balanceManager if token exists
    if (token) {
        balanceManager.fetchBalance();
    } else {
        showSpinError("Please log in to see your balance and play.");
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "N/A";
        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = "N/A";
        if (spinButton) spinButton.disabled = true;
    }
});
