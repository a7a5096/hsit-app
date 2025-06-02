document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    const totalUbtValueDisplay = document.getElementById('totalUbtValueDisplay');
    const totalUsdEquivalentDisplay = document.getElementById('totalUsdEquivalentDisplay');
    const statusMessageDisplay = document.getElementById('statusMessage');

    const UBT_TO_USD_RATE = 1.0; // Given: 1 UBT = 1 USD

    function showStatusMessage(message, type = 'info') {
        if (statusMessageDisplay) {
            statusMessageDisplay.textContent = message;
            statusMessageDisplay.className = `status-message ${type}`;
            statusMessageDisplay.style.display = 'block';
            setTimeout(() => {
                statusMessageDisplay.style.display = 'none';
            }, 7000);
        } else {
            console.log(`Status (${type}): ${message}`);
        }
    }

    async function fetchExchangeRate(pair) { // e.g., btc-usdt, eth-usdt
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/exchange-rates/${pair}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Failed to fetch ${pair} rate. Status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success && typeof data.rate === 'number') {
                return data.rate;
            } else {
                throw new Error(data.message || `Invalid rate data for ${pair}.`);
            }
        } catch (error) {
            console.error(`Error fetching ${pair} rate:`, error);
            showStatusMessage(`Could not load exchange rate for ${pair.toUpperCase()}. Calculations may be incomplete.`, 'warning');
            return null; // Return null if rate fetching fails
        }
    }

    async function fetchAndDisplayTotalUbtBalance() {
        if (!token) {
            showStatusMessage('Authentication token not found. Please log in.', 'error');
            if (totalUbtValueDisplay) totalUbtValueDisplay.textContent = 'Auth Error';
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = 'Equivalent to: $0.00 USD';
            return;
        }

        if (typeof API_URL === 'undefined') {
            showStatusMessage('API configuration is missing. Unable to fetch data.', 'error');
            return;
        }

        try {
            // 1. Fetch user balances
            const balanceResponse = await fetch(`${API_URL}/api/auth`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            });
            if (!balanceResponse.ok) {
                const errorData = await balanceResponse.json().catch(() => ({ message: `HTTP error! Status: ${balanceResponse.status}` }));
                throw new Error(errorData.message || `HTTP error! Status: ${balanceResponse.status}`);
            }
            const balanceData = await balanceResponse.json();
            if (!balanceData.success || !balanceData.balances) {
                throw new Error(balanceData.message || 'Failed to parse user balances.');
            }
            const balances = balanceData.balances;
            const ubtAmount = parseFloat(balances.ubt) || 0;
            const btcAmount = parseFloat(balances.bitcoin) || 0;
            const ethAmount = parseFloat(balances.ethereum) || 0;
            const usdtAmount = parseFloat(balances.usdt) || 0; // Assuming backend provides this

            // 2. Fetch exchange rates (vs USDT, then assume USDT is 1:1 with UBT)
            // If UBT is 1 USD, and USDT is 1 USD, then UBT/USDT rate is 1.
            const usdtToUbtRate = 1.0; 
            
            let btcToUbtRate = 0;
            const btcUsdtRate = await fetchExchangeRate('btc-usdt');
            if (btcUsdtRate !== null) {
                btcToUbtRate = btcUsdtRate * usdtToUbtRate; // Rate of BTC in terms of UBT
            }

            let ethToUbtRate = 0;
            const ethUsdtRate = await fetchExchangeRate('eth-usdt');
            if (ethUsdtRate !== null) {
                ethToUbtRate = ethUsdtRate * usdtToUbtRate; // Rate of ETH in terms of UBT
            }

            // 3. Perform conversions
            const ubtFromBtc = btcAmount * btcToUbtRate;
            const ubtFromEth = ethAmount * ethToUbtRate;
            const ubtFromUsdt = usdtAmount * usdtToUbtRate; // USDT converted to UBT

            // 4. Calculate total UBT
            const totalUbtBalance = ubtAmount + ubtFromBtc + ubtFromEth + ubtFromUsdt;
            const totalUsdValue = totalUbtBalance * UBT_TO_USD_RATE; // Since 1 UBT = 1 USD

            // 5. Display total UBT balance
            if (totalUbtValueDisplay) totalUbtValueDisplay.textContent = `${totalUbtBalance.toFixed(8)}`; // Show more precision for UBT total
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = `Equivalent to: $${totalUsdValue.toFixed(2)} USD`;

        } catch (error) {
            console.error('Error fetching and displaying total UBT balance:', error);
            showStatusMessage(`Error loading asset values: ${error.message}`, 'error');
            if (totalUbtValueDisplay) totalUbtValueDisplay.textContent = 'Error';
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = 'Equivalent to: $0.00 USD';
        }
    }

    fetchAndDisplayTotalUbtBalance();
});
