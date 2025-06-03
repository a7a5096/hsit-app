// js/wheel.js (Modified)

import { getBalance, updateBalance } from './balanceManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const wheel = document.querySelector('.wheel');
    const spinBtn = document.querySelector('.spinBtn');
    const ubtBalanceElement = document.getElementById('ubt-balance-display'); // Assuming an element to display UBT balance
    const spinCost = 10; // Cost per spin

    let userBalance = null;

    // Function to update the displayed balance
    const updateBalanceDisplay = () => {
        if (ubtBalanceElement && userBalance && userBalance.ubt !== undefined) {
            ubtBalanceElement.textContent = `UBT: ${userBalance.ubt.toFixed(2)}`;
        }
    };

    // Initialize balance on page load
    try {
        userBalance = await getBalance(true); // Force refresh on load
        updateBalanceDisplay();
    } catch (error) {
        console.error("Failed to load initial balance:", error);
        if (ubtBalanceElement) ubtBalanceElement.textContent = "Error loading balance.";
    }

    // Listen for balance updates from other parts of the app
    document.addEventListener('balanceUpdated', (event) => {
        userBalance = event.detail;
        updateBalanceDisplay();
    });

    spinBtn.addEventListener('click', async () => {
        // Check if the user can afford the spin
        if (!userBalance || userBalance.ubt < spinCost) {
            alert("You don't have enough UBT to spin the wheel!");
            return;
        }

        spinBtn.disabled = true; // Disable button during spin

        // Deduct spin cost visually and from local state immediately
        userBalance.ubt -= spinCost;
        updateBalanceDisplay();

        // Perform the spin animation
        const randomDegree = Math.floor(Math.random() * 360) + 360 * 5; // Spin multiple times
        wheel.style.transition = 'all 4s ease-out';
        wheel.style.transform = `rotate(${randomDegree}deg)`;

        // Wait for the spin animation to finish
        setTimeout(async () => {
            // Logic to determine prize based on final angle (must match CSS)
            // This is a simplified example.
            const prizes = [100, 1, 20, 5, 50, 2, 30, 10]; // Corresponds to segments
            const actualDegree = randomDegree % 360;
            const segmentAngle = 360 / prizes.length;
            const prizeIndex = Math.floor(actualDegree / segmentAngle);
            const prizeAmount = prizes[prizeIndex];
            
            try {
                // Call the backend to process the wheel spin and get the authoritative new balance
                const token = localStorage.getItem('token');
                const response = await fetch('/api/wheel/spin', { // Assuming this is your endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token,
                    },
                    body: JSON.stringify({ cost: spinCost }) // Send spin cost for validation
                });

                if (!response.ok) {
                    // Handle error, possibly revert optimistic UI update
                    userBalance.ubt += spinCost; // Add back the cost
                    updateBalanceDisplay();
                    throw new Error('Server failed to process the spin.');
                }

                const result = await response.json();

                if (result.success && result.balances) {
                    // Update the balance with the authoritative data from the server
                    updateBalance(result.balances);
                    alert(`Congratulations! You won ${result.prizeWon} UBT!`);
                } else {
                     throw new Error(result.message || 'Spin failed.');
                }

            } catch (error) {
                console.error("Error during spin processing:", error);
                alert(`An error occurred: ${error.message}`);
                // Re-fetch balance to ensure UI is correct after an error
                await getBalance(true);
            } finally {
                wheel.style.transition = 'none';
                const resetAngle = actualDegree;
                wheel.style.transform = `rotate(${resetAngle}deg)`;
                spinBtn.disabled = false; // Re-enable button
            }

        }, 4000); // Matches the transition duration
    });
});
