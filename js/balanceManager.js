// frontend/public/js/balanceManager.js
const balanceManager = {
    config: {
        apiUrl: typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com',
        token: null
    },
    
    async fetchBalance() {
        console.log("BalanceManager: fetchBalance() called. Current token in config:", this.config.token ? "[PRESENT]" : "[MISSING]");
        if (!this.config.token) {
            console.warn("BalanceManager: No token available in config to fetch balance.");
            document.dispatchEvent(new CustomEvent('balanceError', { detail: { message: "User not logged in or token missing" } }));
            this.updateBalance(0); // Reflect 0 balance if no token
            return;
        }
        try {
            console.log(`BalanceManager: Fetching balance from ${this.config.apiUrl}/api/auth`);
            const response = await fetch(`${this.config.apiUrl}/api/auth`, {
                headers: { 'x-auth-token': this.config.token }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch balance. Server status: ${response.status}` }));
                console.error("BalanceManager: fetchBalance response NOT OK.", response.status, errorData);
                throw new Error(errorData.message);
            }
            
            const data = await response.json();
            console.log("BalanceManager: fetchBalance successful, data received:", data);

            if (data.success && data.balances && typeof data.balances.ubt === 'number') {
                this.updateBalance(data.balances.ubt);
            } else {
                console.error("BalanceManager: Invalid balance data structure from server.", data);
                throw new Error('Invalid balance data structure received from server.');
            }
        } catch (error) {
            console.error("BalanceManager: Full fetchBalance Error:", error);
            document.dispatchEvent(new CustomEvent('balanceError', { detail: { message: error.message || "Error fetching balance." } }));
            this.updateBalance(0); // Reflect 0 on error
        }
    },

    updateBalance(newBalance) {
        const numericBalance = parseFloat(newBalance);
        if (isNaN(numericBalance)) {
            console.error("BalanceManager: Attempted to update balance with non-numeric value:", newBalance);
            return;
        }
        localStorage.setItem('ubtBalance', numericBalance.toFixed(2));
        console.log(`BalanceManager: Balance updated to ${numericBalance.toFixed(2)}. Dispatching 'balanceUpdated' event.`);
        document.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: {
                newBalance: numericBalance // Send the number, not the string
            }
        }));
    },

    init() {
        console.log("BalanceManager: init() called.");
        this.config.token = localStorage.getItem('token'); 
        if (this.config.token) {
            console.log("BalanceManager: Token found in localStorage during init.");
            this.fetchBalance();
        } else {
            console.warn("BalanceManager: init() called, but no token found in localStorage. Not fetching; will dispatch 0 balance.");
            this.updateBalance(0); 
        }
    }
};

document.addEventListener('loginSuccess', () => {
    console.log("BalanceManager: Heard 'loginSuccess' event. Initializing balance manager.");
    balanceManager.init();
});

document.addEventListener('logoutSuccess', () => { // Listen for logout
    console.log("BalanceManager: Heard 'logoutSuccess' event. Updating balance to 0.");
    balanceManager.updateBalance(0);
});

console.log("BalanceManager script loaded and parsed.");
