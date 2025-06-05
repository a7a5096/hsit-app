// frontend/public/js/spinning_wheel.js
document.addEventListener('DOMContentLoaded', () => {
    const ubtBalanceDisplay = document.getElementById('ubtBalanceDisplay');
    const spinCostDisplay = document.getElementById('spinCostDisplay');
    const spinButton = document.getElementById('spinButton');
    const wheelElement = document.getElementById('wheel');
    const spinResultPopup = document.getElementById('spinResultPopup'); // Assuming you have this element
    const spinResultMessage = document.getElementById('spinResultMessage'); // And this
    const closePopupButton = document.getElementById('closePopupButton'); // And this

    const COST_PER_SPIN = 10; 
    let currentUserUbtBalance = 0;

    console.log("Spinning Wheel JS: DOMContentLoaded.");

    if (spinCostDisplay) spinCostDisplay.textContent = COST_PER_SPIN;

    function updateDisplay(balance) {
        currentUserUbtBalance = balance;
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = balance.toFixed(2);
        if (spinButton) spinButton.disabled = !localStorage.getItem('token') || balance < COST_PER_SPIN;
    }

    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        console.log(`Spinning Wheel JS: Heard 'balanceUpdated' event! New balance: ${newBalance}`);
        updateDisplay(newBalance);
    });

    document.addEventListener('balanceError', (e) => {
        console.error(`Spinning Wheel JS: Heard 'balanceError' event! Message: ${e.detail.message}`);
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
        if (spinButton) spinButton.disabled = true;
    });

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

        const randomSpins = 3 + Math.floor(Math.random() * 3);
        const randomExtraRotation = Math.random() * 360;
        const targetRotation = currentRotation + (randomSpins * 360) + randomExtraRotation;
        if(wheelElement) {
            wheelElement.style.transition = 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)';
            wheelElement.style.transform = `rotate(${targetRotation}deg)`;
        }
        currentRotation = targetRotation;

        try {
            const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
            const response = await fetch(`${effectiveApiUrl}/api/wheel/spin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || "Spin failed.");

            setTimeout(() => {
                if (spinResultMessage) spinResultMessage.textContent = result.message;
                if (spinResultPopup) spinResultPopup.style.display = 'flex';

                if (result.success && typeof result.newBalance === 'number') {
                    if (typeof balanceManager !== 'undefined') {
                        console.log("Spinning Wheel JS: Spin successful, telling balanceManager to update with new balance:", result.newBalance);
                        balanceManager.updateBalance(result.newBalance);
                    } else {
                        console.error("Spinning Wheel JS: balanceManager not defined after spin!");
                    }
                } else {
                    console.warn("Spinning Wheel JS: Spin response did not have success true or newBalance number.", result);
                    spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN; // Re-evaluate button
                }
            }, 4000); 

        } catch (error) {
            console.error('Error during spin:', error);
            alert(error.message);
            setTimeout(() => {
                spinButton.disabled = currentUserUbtBalance < COST_PER_SPIN;
            }, 4000);
        }
    };
    
    if (spinButton) spinButton.addEventListener('click', handleSpin);
    if (closePopupButton && spinResultPopup) {
        closePopupButton.addEventListener('click', () => {
            spinResultPopup.style.display = 'none';
        });
    }
    
    if (typeof balanceManager !== 'undefined') {
        console.log("Spinning Wheel JS: Page loaded, telling balanceManager to initialize.");
        balanceManager.init();
    } else {
        console.error("Spinning Wheel JS: balanceManager is not defined!");
        updateDisplay(0); // Show 0 or error
    }
});
