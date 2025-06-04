// frontend/public/js/spinning_wheel.js
document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    const wheelElement = document.getElementById('wheel');
    const spinResultPopup = document.getElementById('spinResultPopup');
    const spinResultMessage = document.getElementById('spinResultMessage');
    const closePopupButton = document.getElementById('closePopupButton');

    const COST_PER_SPIN = 10;
    let currentUserUbtBalance = 0;

    console.log("Spinning Wheel JS: DOMContentLoaded.");

    if (spinCostDisplay) spinCostDisplay.textContent = COST_PER_SPIN;

    // --- THIS IS THE CRUCIAL PART ---
    // Listen for global balance updates from balanceManager
    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        console.log(`Spinning Wheel JS: Heard 'balanceUpdated' event! New balance: ${newBalance}`);
        currentUserUbtBalance = newBalance;
        
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = newBalance.toFixed(2);
        if (spinButton) spinButton.disabled = newBalance < COST_PER_SPIN;
    });

    // Listen for balance errors
    document.addEventListener('balanceError', (e) => {
        console.error(`Spinning Wheel JS: Heard 'balanceError' event! Message: ${e.detail.message}`);
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
        if (spinButton) spinButton.disabled = true;
    });
    // --- END CRUCIAL PART ---

    let currentRotation = 0;

    const handleSpin = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please log in to spin.");
            return;
        }
        if (currentUserUbtBalance < COST_PER_SPIN) {
            alert(`Not enough UBT. Cost is ${COST_PER_SPIN} UBT.`);
            return;
        }

        spinButton.disabled = true;

        // Animate the wheel
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
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || "Spin failed.");

            // Wait for animation to finish before showing result
            setTimeout(() => {
                if (spinResultMessage) spinResultMessage.textContent = result.message;
                if (spinResultPopup) spinResultPopup.style.display = 'flex';

                if (result.success && typeof result.newBalance === 'number') {
                    // Tell balanceManager to update the balance. It will dispatch the event
                    // that the listener at the top of this script will hear.
                    balanceManager.updateBalance(result.newBalance);
                } else {
                    // Re-enable button if spin failed but user still has funds
                    spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
                }
            }, 4000); // Match animation duration

        } catch (error) {
            console.error('Error during spin:', error);
            alert(error.message);
            // Re-enable button after animation if an error occurred
            setTimeout(() => {
                spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
            }, 4000);
        }
    };
    
    if (spinButton) spinButton.addEventListener('click', handleSpin);
    if (closePopupButton) closePopupButton.addEventListener('click', () => {
        if (spinResultPopup) spinResultPopup.style.display = 'none';
    });
    
    // Initial call to get balance when page loads
    if (typeof balanceManager !== 'undefined') {
        console.log("Spinning Wheel JS: Page loaded, telling balanceManager to initialize.");
        balanceManager.init();
    } else {
        console.error("Spinning Wheel JS: balanceManager is not defined!");
    }
});
