// frontend/public/js/asset_center.js
document.addEventListener('DOMContentLoaded', function() {
    const ubtBalanceAmountEl = document.getElementById('ubtBalanceAmount');
    const totalValueDisplayEl = document.getElementById('totalValueDisplay'); // Target the specific span
    const totalValueInUsdEl = document.getElementById('totalValueInUsd');

    console.log("Asset Center JS: DOMContentLoaded.");

    // --- THIS IS THE CRUCIAL PART ---
    // Listen for global balance updates from balanceManager
    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        console.log(`Asset Center JS: Heard 'balanceUpdated' event! New balance: ${newBalance}`);
        
        // Update all relevant elements on the page
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = `${newBalance.toFixed(2)} UBT`;
        if (totalValueDisplayEl) totalValueDisplayEl.textContent = newBalance.toFixed(2);
        if (totalValueInUsdEl) totalValueInUsdEl.textContent = `Equivalent to: $${newBalance.toFixed(2)} USD`; // Assuming 1 UBT = 1 USD
    });

    // Listen for balance errors to show an error state
    document.addEventListener('balanceError', (e) => {
        console.error(`Asset Center JS: Heard 'balanceError' event! Message: ${e.detail.message}`);
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = 'Error';
        if (totalValueDisplayEl) totalValueDisplayEl.textContent = 'Error';
        if (totalValueInUsdEl) totalValueInUsdEl.textContent = 'Equivalent to: Error';
    });
    // --- END CRUCIAL PART ---

    // Initial call to balanceManager to fetch balance when the page first loads
    if (typeof balanceManager !== 'undefined') {
        console.log("Asset Center JS: Page loaded, telling balanceManager to initialize.");
        balanceManager.init(); 
    } else {
        console.error("Asset Center JS: balanceManager is not defined!");
    }
});
