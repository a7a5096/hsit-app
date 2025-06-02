document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton'); // Using 'spinButton'
    
    // New elements from user's HTML
    const wheelElement = document.getElementById('wheel'); // The main wheel div
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
            return 0;
        }
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/auth`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) {
                 const errData = await response.json().catch(()=> ({message: "Error fetching balance"}));
                 throw new Error(errData.message);
            }
            const data = await response.json();
            if (data.success && data.balances && typeof data.balances.ubt === 'number') {
                currentUserUbtBalance = data.balances.ubt;
                if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2); // Update new balance initially
                if(spinButton) spinButton.disabled = false;
                return currentUserUbtBalance;
            } else {
                throw new Error("Invalid balance data received.");
            }
        } catch (error) {
            console.error('Error fetching user UBT balance:', error);
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
            showSpinError(error.message || "Could not load your UBT balance.");
            if(spinButton) spinButton.disabled = true;
            return 0;
        }
    }

    let currentRotation = 0;
    let spinAnimation;

    function animateWheel(isSpinning, finalRotationAngle = null) {
        if (wheelElement) {
            if (isSpinning) {
                wheelElement.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)'; // Smooth spin animation
                const randomSpins = 3 + Math.floor(Math.random() * 3); // 3 to 5 full spins
                const targetRotation = currentRotation + (randomSpins * 360) + (finalRotationAngle !== null ? finalRotationAngle : Math.random() * 360);
                
                // Apply the rotation
                wheelElement.style.transform = `rotate(${targetRotation}deg)`;
                currentRotation = targetRotation; // Store the target for next spin reference
            } else {
                // To stop smoothly at a specific angle determined by the prize
                if (finalRotationAngle !== null) {
                    // Calculate minimal additional rotation to land on the prize segment
                    // This requires mapping prize segments to angles.
                    // For now, the spin above already includes a final random angle.
                    // To truly stop on a segment, the backend would ideally determine the segment,
                    // and JS would map that segment to a specific angle.
                    // For this example, we'll just let the 3s animation complete.
                    // If you want it to "snap" to the prize, you'd set this directly:
                    // wheelElement.style.transition = 'transform 0.5s ease-out';
                    // wheelElement.style.transform = `rotate(${finalRotationAngle}deg)`;
                    // currentRotation = finalRotationAngle;
                }
                // The actual stopping will be handled by the end of the CSS transition
            }
        }
    }

    async function handleSpin() {
        if (!token) {
            showSpinError("Please log in to spin.");
            return;
        }
        
        clearSpinMessages();

        if (currentUserUbtBalance < COST_PER_SPIN) {
            showSpinError(`Not enough UBT to spin. Cost is ${COST_PER_SPIN} UBT.`);
            return;
        }

        if (spinButton) spinButton.disabled = true;
        if (resultMessage) resultMessage.textContent = "Spinning...";
        
        // Simulate a target angle for a prize (you'll need to map prizes to angles)
        // For now, it's a random spin; backend determines actual prize
        animateWheel(true, null); 

        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/wheel/spin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                }
            });
            
            // The wheel visually stops after its animation (3s in this example)
            // Backend response determines the actual outcome.

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Spin failed. Status: ${response.status}` }));
                throw new Error(errorData.message || `Spin failed. Status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Update UI after a slight delay to let the wheel "settle" visually if needed,
                // or if your animation function has a callback/promise.
                // For this example, we update immediately after getting the result.
                if (resultMessage) resultMessage.textContent = result.message || `You won ${result.prizeAmount || 0} UBT!`;
                if (winningsAmountDisplay) winningsAmountDisplay.textContent = result.prizeAmount || 0;
                
                if (typeof result.newBalance === 'number') {
                    currentUserUbtBalance = result.newBalance;
                    if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                    if (newUbtBalanceDisplay) newUbtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                } else {
                    await fetchUserUbtBalance(); // Re-fetch balance if not provided
                }
            } else {
                throw new Error(result.message || "Spin was not successful.");
            }
        } catch (error) {
            console.error('Error during spin:', error);
            showSpinError(error.message || "An error occurred during the spin.");
        } finally {
            // Re-enable button after animation and result display (add delay if needed)
            setTimeout(() => {
                if (spinButton) spinButton.disabled = false;
            }, 3000); // Match CSS transition duration for spinning
        }
    }

    if (spinButton) {
        spinButton.addEventListener('click', handleSpin);
    }

    fetchUserUbtBalance(); // Initial balance load
});
