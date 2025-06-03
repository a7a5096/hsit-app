// A centralized module to manage and broadcast the user's UBT balance.

const balanceManager = {
    config: {
        apiUrl: 'https://hsit-backend.onrender.com', // Make sure this is consistent
        token: localStorage.getItem('token')
    },
    
    // Fetches the balance from the server and updates it locally
    async fetchBalance() {
        if (!this.config.token) {
            console.error("BalanceManager: No token found.");
            return;
        }
        try {
            const response = await fetch(`${this.config.apiUrl}/api/auth`, {
                headers: { 'x-auth-token': this.config.token }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch balance data.');
            }
            
            const data = await response.json();

            if (data.success && data.balances && typeof data.balances.ubt === 'number') {
                this.updateBalance(data.balances.ubt);
            } else {
                throw new Error('Invalid balance data received from server.');
            }
        } catch (error) {
            console.error("BalanceManager Error:", error.message);
            // Optionally dispatch an event for UI to show an error state
            document.dispatchEvent(new CustomEvent('balanceError', { detail: { message: error.message } }));
        }
    },

    // Updates the local balance and notifies all listeners
    updateBalance(newBalance) {
        // Store it locally for quick access if needed
        localStorage.setItem('ubtBalance', newBalance);

        // Dispatch a custom event to notify any part of the app that is listening
        document.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: {
                newBalance: parseFloat(newBalance)
            }
        }));
    }
};

// Initial fetch when the application loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if a user is likely logged in before fetching
    if (localStorage.getItem('token')) {
        balanceManager.fetchBalance();
    }
});
