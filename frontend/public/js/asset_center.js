document.addEventListener('DOMContentLoaded', function() {
    // --- Listen for global balance updates ---
    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        const ubtBalanceAmountEl = document.getElementById('ubt-balance-amount');
        const ubtEstValueEl = document.getElementById('ubt-est-value');
        
        if (ubtBalanceAmountEl) {
            ubtBalanceAmountEl.textContent = newBalance.toFixed(2);
        }
        // Assuming UBT price is $1 for estimation
        if (ubtEstValueEl) {
            ubtEstValueEl.textContent = `$${newBalance.toFixed(2)} USD`;
        }
        // You would also update the total balance here by recalculating it
        updateTotalBalance();
    });

    document.addEventListener('balanceError', (e) => {
        // Handle error display if needed
        const ubtBalanceAmountEl = document.getElementById('ubt-balance-amount');
        if (ubtBalanceAmountEl) {
            ubtBalanceAmountEl.textContent = 'Error';
        }
    });

    function updateTotalBalance() {
        // This function would grab all asset values and sum them up
        // For this example, we'll just show the UBT balance as the total
        const ubtBalance = parseFloat(localStorage.getItem('ubtBalance') || '0');
        const totalValueEl = document.querySelector('.total-value');
        if (totalValueEl) {
            totalValueEl.textContent = ubtBalance.toFixed(2);
        }
    }
    
    // On initial load, try to get the balance from localStorage
    const cachedBalance = localStorage.getItem('ubtBalance');
    if (cachedBalance) {
         document.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { newBalance: parseFloat(cachedBalance) } }));
    } else {
        // If no cached balance, explicitly fetch it
        balanceManager.fetchBalance();
    }
});
