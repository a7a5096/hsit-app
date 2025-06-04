// frontend/public/js/balanceManager.js
const balanceManager = {
    config: {
        apiUrl: typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com',
        token: null
    },
    
    async fetchBalance() {
        console.log("BalanceManager: fetchBalance() called. Current token in config:", this.config.token); // Log 1
        if (!this.config.token) {
            console.warn("BalanceManager: No token available in config to fetch balance."); // Log 2 (This is your line 9 warning)
            document.dispatchEvent(new CustomEvent('balanceError', { detail: { message: "User not logged in or token missing" } }));
            return;
        }
        try {
            console.log(`BalanceManager: Fetching balance from ${this.config.apiUrl}/api/auth`); // Log 3
            const response = await fetch(`${this.config.apiUrl}/api/auth`, {
                headers: { 'x-auth-token': this.config.token }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch balance. Server status: ${response.status}` }));
                console.error("BalanceManager: fetchBalance response NOT OK.", response.status, errorData); // Log 4
                throw new Error(errorData.message);
            }
            
            const data = await response.json();
            console.log("BalanceManager: fetchBalance successful, data received:", data); // Log 5

            if (data.success && data.balances && typeof data.balances.ubt === 'number') {
                this.updateBalance(data.balances.ubt);
            } else {
                console.error("BalanceManager: Invalid balance data structure from server.", data); // Log 6
                throw new Error('Invalid balance data structure from server.');
            }
        } catch (error) {
            console.error("BalanceManager: Full fetchBalance Error:", error); // Log 7
            document.dispatchEvent(new CustomEvent('balanceError', { detail: { message: error.message || "Error fetching balance." } }));
        }
    },

    updateBalance(newBalance) {
        const numericBalance = parseFloat(newBalance);
        if (isNaN(numericBalance)) {
            console.error("BalanceManager: Attempted to update balance with non-numeric value:", newBalance); // Log 8
            return;
        }
        localStorage.setItem('ubtBalance', numericBalance.toFixed(2));
        console.log(`BalanceManager: Balance updated to ${numericBalance.toFixed(2)}. Dispatching 'balanceUpdated' event.`); // Log 9
        document.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: {
                newBalance: numericBalance
            }
        }));
    },

    init() {
        console.log("BalanceManager: init() called."); // Log 10
        this.config.token = localStorage.getItem('token'); // Get fresh token
        if (this.config.token) {
            console.log("BalanceManager: Token found in localStorage during init:", this.config.token ? "[PRESENT]" : "[MISSING]"); // Log 11
            this.fetchBalance();
        } else {
            console.warn("BalanceManager: init() called, but no token found in localStorage. Not fetching."); // Log 12
            this.updateBalance(0); // Set to 0 and dispatch if no token (e.g. on logout or initial load)
        }
    }
};

document.addEventListener('loginSuccess', () => {
    console.log("BalanceManager: 'loginSuccess' event received. Initializing balance manager."); // Log 13
    balanceManager.init();
});

// This allows pages to initialize balance if already logged in (e.g. on page refresh)
// Page-specific scripts should call balanceManager.init() on their DOMContentLoaded if needed.
// For example, if dashboard.js needs the balance immediately:
// document.addEventListener('DOMContentLoaded', () => {
// if (localStorage.getItem('token')) balanceManager.init();
// });

console.log("BalanceManager script loaded and parsed."); // Log 14 (Your line 73)
