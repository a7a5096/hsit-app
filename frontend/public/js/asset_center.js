document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    // DOM Elements for displaying balances (ensure these IDs match your asset_center.html)
    const totalUbtValueDisplay = document.getElementById('totalUbtValueDisplay');
    const totalUsdEquivalentDisplay = document.getElementById('totalUsdEquivalentDisplay');
    const statusMessageDisplay = document.getElementById('statusMessage'); // For general messages

    const UBT_TO_USD_RATE = 1.0; // Given: 1 UBT = 1 USD

    function showStatusMessage(message, type = 'info', duration = 7000) {
        if (statusMessageDisplay) {
            statusMessageDisplay.textContent = message;
            statusMessageDisplay.className = `status-message ${type}`;
            statusMessageDisplay.style.display = 'block';
            setTimeout(() => {
                statusMessageDisplay.style.display = 'none';
            }, duration);
        } else {
            console.log(`Status (${type}): ${message}`);
        }
    }

    async function fetchExchangeRate(pair) { // e.g., btc-usdt, eth-usdt
        console.log(`AssetCenter: Fetching exchange rate for ${pair}...`);
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/exchange-rates/${pair}`);
            console.log(`AssetCenter: Response status for ${pair} rate: ${response.status}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Failed to fetch ${pair} rate. Status: ${response.status}`);
            }
            const data = await response.json();
            console.log(`AssetCenter: Data for ${pair} rate:`, data);
            if (data.success && typeof data.rate === 'number') {
                return data.rate;
            } else {
                throw new Error(data.message || `Invalid rate data for ${pair}.`);
            }
        } catch (error) {
            console.error(`AssetCenter: Error fetching ${pair} rate:`, error);
            showStatusMessage(`Could not load exchange rate for ${pair.toUpperCase()}. Calculations may be incomplete.`, 'warning');
            return null; // Return null if rate fetching fails
        }
    }

    async function fetchAndDisplayTotalUbtBalance() {
        console.log("AssetCenter: Starting fetchAndDisplayTotalUbtBalance...");
        if (!token) {
            showStatusMessage('Authentication token not found. Please log in.', 'error');
            if (totalUbtValueDisplay) totalUbtValueDisplay.textContent = 'Auth Error';
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = 'Equivalent to: $0.00 USD';
            console.log("AssetCenter: No token found.");
            return;
        }

        if (typeof API_URL === 'undefined') {
            showStatusMessage('API configuration is missing. Unable to fetch data.', 'error');
            console.error("AssetCenter: API_URL is not defined.");
            if (totalUbtValueDisplay) totalUbtValueDisplay.textContent = 'Config Error';
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = 'Equivalent to: $0.00 USD';
            return;
        }
        console.log("AssetCenter: API_URL is defined:", API_URL);

        try {
            // 1. Fetch user balances
            console.log("AssetCenter: Fetching user balances...");
            const balanceResponse = await fetch(`${API_URL}/api/auth`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
            });
            console.log("AssetCenter: Balance response status:", balanceResponse.status);
            if (!balanceResponse.ok) {
                const errorData = await balanceResponse.json().catch(() => ({ message: `HTTP error fetching balances! Status: ${balanceResponse.status}` }));
                throw new Error(errorData.message);
            }
            const balanceData = await balanceResponse.json();
            console.log("AssetCenter: Balance data received:", balanceData);

            if (!balanceData.success || !balanceData.balances) {
                throw new Error(balanceData.message || 'Failed to parse user balances from API.');
            }
            const balances = balanceData.balances;
            const ubtAmount = parseFloat(balances.ubt) || 0;
            const btcAmount = parseFloat(balances.bitcoin) || 0;
            const ethAmount = parseFloat(balances.ethereum) || 0;
            // Assuming backend provides 'usdt' in balances object. If not, this will be 0.
            const usdtAmount = parseFloat(balances.usdt) || 0; 
            console.log(`AssetCenter: Parsed balances - UBT: ${ubtAmount}, BTC: ${btcAmount}, ETH: ${ethAmount}, USDT: ${usdtAmount}`);

            // 2. Fetch exchange rates
            // Assuming 1 UBT = 1 USDT for conversion purposes, or direct UBT rates if available
            // If UBT is pegged 1:1 with USD, and USDT is pegged 1:1 with USD, then UBT_PER_USDT = 1
            const UBT_PER_USDT = 1.0; 
            
            let btcToUbtRate = 0;
            const btcUsdtRate = await fetchExchangeRate('btc-usdt');
            if (btcUsdtRate !== null) {
                btcToUbtRate = btcUsdtRate * UBT_PER_USDT; 
            }

            let ethToUbtRate = 0;
            const ethUsdtRate = await fetchExchangeRate('eth-usdt');
            if (ethUsdtRate !== null) {
                ethToUbtRate = ethUsdtRate * UBT_PER_USDT;
            }
            
            console.log(`AssetCenter: Calculated conversion rates - BTC to UBT: ${btcToUbtRate}, ETH to UBT: ${ethToUbtRate}`);

            // 3. Perform conversions
            const ubtFromBtc = btcAmount * btcToUbtRate;
            const ubtFromEth = ethAmount * ethToUbtRate;
            const ubtFromUsdt = usdtAmount * UBT_PER_USDT; // USDT converted to UBT
            console.log(`AssetCenter: UBT equivalents - from BTC: ${ubtFromBtc}, from ETH: ${ubtFromEth}, from USDT: ${ubtFromUsdt}`);

            // 4. Calculate total UBT
            const totalUbtBalance = ubtAmount + ubtFromBtc + ubtFromEth + ubtFromUsdt;
            const totalUsdValue = totalUbtBalance * UBT_TO_USD_RATE; // UBT_TO_USD_RATE is 1.0
            console.log(`AssetCenter: Total UBT Balance calculated: ${totalUbtBalance}, Total USD Value: ${totalUsdValue}`);

            // 5. Display total UBT balance
            if (totalUbtValueDisplay) {
                console.log("AssetCenter: Updating totalUbtValueDisplay DOM element.");
                totalUbtValueDisplay.textContent = `${totalUbtBalance.toFixed(8)}`; // UBT can have more precision
            } else {
                console.error("AssetCenter: totalUbtValueDisplay DOM element not found!");
            }
            if (totalUsdEquivalentDisplay) {
                console.log("AssetCenter: Updating totalUsdEquivalentDisplay DOM element.");
                totalUsdEquivalentDisplay.textContent = `Equivalent to: $${totalUsdValue.toFixed(2)} USD`;
            } else {
                console.error("AssetCenter: totalUsdEquivalentDisplay DOM element not found!");
            }
            console.log("AssetCenter: DOM updates presumably complete.");

        } catch (error) {
            console.error('AssetCenter: Error in fetchAndDisplayTotalUbtBalance:', error.message, error.stack);
            showStatusMessage(`Error loading asset values: ${error.message}`, 'error');
            if (totalUbtValueDisplay) totalUbtValueDisplay.textContent = 'Error';
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = 'Equivalent to: $0.00 USD';
        }
    }

    // Initial call to load data when the page is ready
    fetchAndDisplayTotalUbtBalance();
});
