document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    // DOM Elements for displaying balances
    const totalValueDisplay = document.getElementById('totalValueDisplay');
    const totalValueInUsdDisplay = document.getElementById('totalValueInUsd');
    const ubtBalanceDisplay = document.getElementById('ubtBalanceAmount');
    const ubtEstValueDisplay = document.getElementById('ubtEstValue');
    // Removed selectors for btc, eth, usdt elements
    const statusMessageDisplay = document.getElementById('statusMessage');

    function showStatusMessage(message, type = 'info') {
        if (statusMessageDisplay) {
            statusMessageDisplay.textContent = message;
            statusMessageDisplay.className = `status-message ${type}`;
            statusMessageDisplay.style.display = 'block';
            setTimeout(() => {
                statusMessageDisplay.style.display = 'none';
            }, 5000);
        } else {
            console.log(`Status (${type}): ${message}`);
        }
    }

    async function fetchAndDisplayBalances() {
        if (!token) {
            showStatusMessage('Authentication token not found. Please log in.', 'error');
            // Optionally redirect to login
            // window.location.href = 'index.html'; 
            return;
        }

        if (typeof API_URL === 'undefined') {
            showStatusMessage('API configuration is missing. Unable to fetch data.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth`, { // This endpoint returns all balances including UBT
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.user && data.balances) {
                const balances = data.balances;
                const ubtAmount = parseFloat(balances.ubt) || 0;

                // Update UBT display
                if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = `${ubtAmount.toFixed(8)} UBT`;
                // Total UBT Value is the UBT amount
                if (totalValueDisplay) totalValueDisplay.textContent = `${ubtAmount.toFixed(2)}`;

                // Placeholder for USD values - requires exchange rate integration for UBT to USD
                const notAvailableText = "≈ N/A USD";
                if (ubtEstValueDisplay) ubtEstValueDisplay.textContent = notAvailableText;
                if (totalValueInUsdDisplay) totalValueInUsdDisplay.textContent = `Equivalent to: N/A USD`;

                // Example: If you had a UBT to USD rate (e.g. from config or another API call)
                // const ubtToUsdRate = 0.0325; // Example rate
                // if (ubtEstValueDisplay) ubtEstValueDisplay.textContent = `≈ $${(ubtAmount * ubtToUsdRate).toFixed(2)} USD`;
                // if (totalValueInUsdDisplay) totalValueInUsdDisplay.textContent = `Equivalent to: $${(ubtAmount * ubtToUsdRate).toFixed(2)} USD`;

            } else {
                throw new Error(data.message || 'Failed to parse user data or balances missing.');
            }
        } catch (error) {
            console.error('Error fetching asset data:', error);
            showStatusMessage(`Error loading balances: ${error.message}`, 'error');
            if (totalValueDisplay) totalValueDisplay.textContent = 'Error';
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = 'Error UBT';
        }
    }

    fetchAndDisplayBalances();
});
