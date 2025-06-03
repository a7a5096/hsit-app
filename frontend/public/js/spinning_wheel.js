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
    let currentUserUbtBalance = 0;
    const COST_PER_SPIN = 10; 

    if (spinCostDisplay) {
        spinCostDisplay.textContent = COST_PER_SPIN;
    }

    function showSpinError(message) {
        if (spinError) {
            spinError.textContent = message;
            spinError.style.display = 'block';
        }
        if (resultMessage) resultMessage.textContent = '';
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
    }
    
    function clearSpinMessages() {
        if (spinError) spinError.style.display = 'none';
        if (resultMessage) resultMessage.textContent = '';
        if (winningsAmountDisplay) winningsAmountDisplay.textContent = '0';
        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = 'N/A';
    }

    async function fetchUserUbtBalance() {
        if (!token) {
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "N/A (Not Logged In)";
            showSpinError("Please log in to play.");
            if(spinButton) spinButton.disabled = true;
            return;
        }
        try {
            // Ensure API_URL is defined (from config.js or elsewhere)
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            
            const response = await fetch(`${API_URL}/api/auth`, {
                headers: { 'x-auth-token': token }
            });
            
            if (!response.ok) {
                 const errData = await response.json().catch(()=> ({message: "Error fetching balance"}));
                 throw new Error(errData.message || "Could not fetch balance.");
            }
            const data = await response.json();

            // Assuming user data is nested under a 'user' object
            const user = data.user;

            if (user && user.balances && typeof user.balances.ubt === 'number') {
                currentUserUbtBalance = user.balances.ubt;
                if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                if(spinButton) spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
            } else {
                throw new Error("Invalid user or balance data received.");
            }
        } catch (error) {
            console.error('Error fetching user UBT balance:', error);
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
            showSpinError(error.message);
            if(spinButton) spinButton.disabled = true;
        }
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
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/wheel/spin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                }
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Spin failed with status: ${response.status}`);
            }

            if (result.success) {
                // Update UI after a delay to let the wheel "settle" visually
                setTimeout(() => {
                    if (resultMessage) resultMessage.textContent = result.message;
                    if (winningsAmountDisplay) winningsAmountDisplay.textContent = result.prizeAmount || 0;
                    
                    if (typeof result.newBalance === 'number') {
                        currentUserUbtBalance = result.newBalance;
                        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                        if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                    }

                    // *** HANDLE SPIN AGAIN LOGIC ***
                    if (result.isSpinAgain) {
                        // Re-enable the button immediately for another spin
                        if(spinButton) spinButton.disabled = false;
                    } else {
                        // For other prizes, keep it disabled until animation is fully over
                        // Or just re-enable based on balance
                        if (spinButton) spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
                    }

                }, 3000); // Match this delay to the animation time

            } else {
                throw new Error(result.message || "Spin was not successful.");
            }
        } catch (error) {
            console.error('Error during spin:', error);
            showSpinError(error.message);
            // Re-enable button on error after animation time
            setTimeout(() => {
                if (spinButton) spinButton.disabled = false;
            }, 3000);
        }
    }

    if (spinButton) {
        spinButton.addEventListener('click', handleSpin);
    }

    // Initial balance load
    fetchUserUbtBalance(); 
});
