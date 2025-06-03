document.addEventListener('DOMContentLoaded', function() {
    const ubtBalanceAmountEl = document.getElementById('ubt-balance-amount');
    const ubtEstValueEl = document.getElementById('ubt-est-value');
    const totalValueEl = document.querySelector('.total-value'); // Assuming this is for the card total

    // Listen for global balance updates
    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        
        if (ubtBalanceAmountEl) {
            ubtBalanceAmountEl.textContent = newBalance.toFixed(2);
        }
        // Assuming UBT price is $1 for estimation for now
        if (ubtEstValueEl) {
            ubtEstValueEl.textContent = `$${newBalance.toFixed(2)} USD`;
        }
        updateTotalBalanceCard(newBalance); // Update the main card total
    });

    // Listen for balance errors
    document.addEventListener('balanceError', (e) => {
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = 'Error';
        if (ubtEstValueEl) ubtEstValueEl.textContent = 'Error';
        if (totalValueEl) totalValueEl.textContent = 'Error';
    });

    function updateTotalBalanceCard(ubtBalance) {
        // In a real scenario, you'd sum all asset values.
        // For now, we'll assume UBT is the primary component of the total display.
        if (totalValueEl) {
            totalValueEl.textContent = ubtBalance.toFixed(2);
        }
    }
    
    // Request initial balance update from balanceManager if token exists
    if (localStorage.getItem('token')) {
        balanceManager.fetchBalance();
    } else {
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = 'N/A';
        if (ubtEstValueEl) ubtEstValueEl.textContent = 'N/A';
        if (totalValueEl) totalValueEl.textContent = 'N/A';
    }
});
