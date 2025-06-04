// frontend/public/js/asset_center.js
document.addEventListener('DOMContentLoaded', function() {
    const ubtBalanceAmountEl = document.getElementById('ubt-balance-amount'); // Assuming an element with this ID for UBT amount
    const ubtEstValueEl = document.getElementById('ubt-est-value'); // Assuming an element for UBT estimated value
    const totalValueEl = document.querySelector('.total-value'); // For the main summary card

    console.log("Asset Center JS: DOMContentLoaded.");

    // Listen for global balance updates from balanceManager
    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        console.log(`Asset Center JS: 'balanceUpdated' event received! New balance: ${newBalance}`);
        
        if (ubtBalanceAmountEl) {
            ubtBalanceAmountEl.textContent = newBalance.toFixed(2);
        }
        // Assuming UBT price is $1 for estimation for now
        if (ubtEstValueEl) {
            ubtEstValueEl.textContent = `$${newBalance.toFixed(2)} USD`;
        }
        // This function would ideally sum all asset values if you have more than UBT
        updateTotalBalanceCard(newBalance); 
    });

    // Listen for balance errors from balanceManager
    document.addEventListener('balanceError', (e) => {
        console.error(`Asset Center JS: 'balanceError' event received! Message: ${e.detail.message}`);
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = 'Error';
        if (ubtEstValueEl) ubtEstValueEl.textContent = 'Error';
        if (totalValueEl) totalValueEl.textContent = 'Error';
    });

    function updateTotalBalanceCard(ubtBalance) {
        // For now, assume total value is primarily UBT for display on this card
        if (totalValueEl) {
            totalValueEl.textContent = ubtBalance.toFixed(2); // Just show UBT as the total for simplicity
        }
        // If you have other assets (BTC, ETH) displayed, you would fetch their balances
        // and calculate a total USD equivalent here.
    }
    
    // Initial call to balanceManager to fetch balance if user is already logged in or on page load
    if (typeof balanceManager !== 'undefined') {
        console.log("Asset Center JS: Page loaded, calling balanceManager.init().");
        balanceManager.init(); // balanceManager will check for token internally
    } else {
        console.error("Asset Center JS: balanceManager is not defined!");
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = 'Error';
        if (ubtEstValueEl) ubtEstValueEl.textContent = 'Error';
        if (totalValueEl) totalValueEl.textContent = 'Error';
    }

    // Add logic here to fetch and display other asset balances if needed
    // For example, fetch BTC, ETH balances and update their respective elements
});
