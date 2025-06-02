document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    const wheelStatus = document.getElementById('wheelStatus'); // For "Spinning..." or simple win/loss
    const prizeResult = document.getElementById('prizeResult');   // For detailed prize
    const spinError = document.getElementById('spinError');     // For errors related to spin action
    const wheelImage = document.getElementById('wheelImage');   // To animate the wheel

    const token = localStorage.getItem('token');
    let currentUserUbtBalance = 0;
    const COST_PER_SPIN = 10; // Define cost per spin, should match backend

    if (spinCostDisplay) {
        spinCostDisplay.textContent = COST_PER_SPIN;
    }

    function showSpinError(message) {
        if (spinError) {
            spinError.textContent = message;
            spinError.style.display = 'block';
        }
        if (wheelStatus) wheelStatus.textContent = '';
        if (prizeResult) prizeResult.textContent = '';
    }
    
    function clearSpinMessages() {
        if (spinError) spinError.style.display = 'none';
        if (wheelStatus) wheelStatus.textContent = '';
        if (prizeResult) prizeResult.textContent = '';
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

    function animateWheel(isSpinning) {
        if (wheelImage) {
            if (isSpinning) {
                wheelImage.style.transition = 'transform 0.1s linear';
                let rotation = 0;
                wheelImage.spinInterval = setInterval(() => {
                    rotation = (rotation + 30) % 360;
                    wheelImage.style.transform = `rotate(${rotation}deg)`;
                }, 100);
            } else {
                if (wheelImage.spinInterval) {
                    clearInterval(wheelImage.spinInterval);
                }
                // Optionally set to a final resting position based on prize
                // For now, just stop the continuous spin effect
                wheelImage.style.transition = 'transform 0.5s ease-out'; // Smooth stop
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
        if (wheelStatus) wheelStatus.textContent = "Spinning...";
        animateWheel(true);

        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/wheel/spin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                },
                // Backend might deduct cost automatically based on pre-defined game cost
                // Or, you can send it if your backend expects it:
                // body: JSON.stringify({ betAmount: COST_PER_SPIN }) 
            });
            
            animateWheel(false); // Stop animation after fetch starts or finishes

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Spin failed. Status: ${response.status}` }));
                throw new Error(errorData.message || `Spin failed. Status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                if (wheelStatus) wheelStatus.textContent = result.message || `You won ${result.prizeAmount || 0} UBT!`;
                if (prizeResult) prizeResult.textContent = `Prize: ${result.prizeName || 'Try Again'}`;
                
                // Update balance display with the new balance from backend
                if (typeof result.newBalance === 'number') {
                    currentUserUbtBalance = result.newBalance;
                    if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                } else {
                    // If newBalance isn't returned, re-fetch (less ideal but a fallback)
                    await fetchUserUbtBalance();
                }
            } else {
                throw new Error(result.message || "Spin was not successful.");
            }
        } catch (error) {
            console.error('Error during spin:', error);
            showSpinError(error.message || "An error occurred during the spin.");
            animateWheel(false); // Ensure animation stops on error
        } finally {
            if (spinButton) spinButton.disabled = false;
        }
    }

    if (spinButton) {
        spinButton.addEventListener('click', handleSpin);
    }

    // Initial actions
    fetchUserUbtBalance();
});
