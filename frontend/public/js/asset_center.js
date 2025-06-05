// frontend/public/js/asset_center.js
document.addEventListener('DOMContentLoaded', function() {
    const ubtBalanceAmountEl = document.getElementById('ubtBalanceAmount'); // In your HTML: <span class="asset-amount" id="ubtBalanceAmount">
    const totalValueDisplayEl = document.getElementById('totalValueDisplay');   // In your HTML: <span id="totalValueDisplay">
    const totalValueInUsdEl = document.getElementById('totalValueInUsd');       // In your HTML: <p class="info-text" id="totalValueInUsd">

    console.log("Asset Center JS: DOMContentLoaded.");

    function updateDisplay(balance) {
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = `${balance.toFixed(2)} UBT`;
        if (totalValueDisplayEl) totalValueDisplayEl.textContent = balance.toFixed(2);
        if (totalValueInUsdEl) totalValueInUsdEl.textContent = `Equivalent to: $${balance.toFixed(2)} USD`; // Assuming 1 UBT = 1 USD
    }

    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        console.log(`Asset Center JS: Heard 'balanceUpdated' event! New balance: ${newBalance}`);
        updateDisplay(newBalance);
    });

    document.addEventListener('balanceError', (e) => {
        console.error(`Asset Center JS: Heard 'balanceError' event! Message: ${e.detail.message}`);
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = 'Error';
        if (totalValueDisplayEl) totalValueDisplayEl.textContent = 'Error';
        if (totalValueInUsdEl) totalValueInUsdEl.textContent = 'Equivalent to: Error';
    });

    if (typeof balanceManager !== 'undefined') {
        console.log("Asset Center JS: Page loaded, telling balanceManager to initialize.");
        balanceManager.init(); 
    } else {
        console.error("Asset Center JS: balanceManager is not defined!");
        updateDisplay(0); // Show 0 or error if balanceManager isn't there
    }
});
