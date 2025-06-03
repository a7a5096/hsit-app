const balanceManager = {
    config: {
        apiUrl: typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com', // Ensure API_URL is defined globally or via config.js
        token: null // Will be set on init
    },
    
    async fetchBalance() {
        if (!this.config.token) {
            console.warn("BalanceManager: No token available to fetch balance.");
            document.dispatchEvent(new CustomEvent('balanceError', { detail: { message: "User not logged in or token missing" } }));
            return;
        }
        try {
            const response = await fetch(`${this.config.apiUrl}/api/auth`, {
                headers: { 'x-auth-token': this.config.token }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch balance. Server status: ${response.status}` }));
                throw new Error(errorData.message);
            }
            
            const data = await response.json();

            if (data.success && data.balances && typeof data.balances.ubt === 'number') {
                this.updateBalance(data.balances.ubt);
            } else {
                console.error("BalanceManager: Invalid balance data received from server.", data);
                throw new Error('Invalid balance data received from server.');
            }
        } catch (error) {
            console.error("BalanceManager Fetch Error:", error.message);
            document.dispatchEvent(new CustomEvent('balanceError', { detail: { message: error.message } }));
        }
    },

    updateBalance(newBalance) {
        const numericBalance = parseFloat(newBalance);
        if (isNaN(numericBalance)) {
            console.error("BalanceManager: Attempted to update balance with a non-numeric value:", newBalance);
            return;
        }
        localStorage.setItem('ubtBalance', numericBalance.toFixed(2)); // Store with fixed precision
        console.log(`BalanceManager: Balance updated to ${numericBalance.toFixed(2)}. Dispatching event.`);
        document.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: {
                newBalance: numericBalance
            }
        }));
    },

    // Initialize the manager, typically called when a page loads or after login
    init() {
        console.log("BalanceManager: init called.");
        this.config.token = localStorage.getItem('token');
        if (this.config.token) {
            this.fetchBalance();
        } else {
            console.warn("BalanceManager: Init called, but no token found. User might be logged out.");
            // Optionally dispatch an event to clear balance displays if necessary
            this.updateBalance(0); // Or dispatch a specific logout/no-balance event
        }
    }
};

// Listen for a custom 'loginSuccess' event to initialize/refresh the balance
document.addEventListener('loginSuccess', () => {
    console.log("BalanceManager: 'loginSuccess' event received. Initializing.");
    balanceManager.init();
});

// For debugging: log when balanceManager script is parsed
console.log("BalanceManager script loaded and parsed.");
