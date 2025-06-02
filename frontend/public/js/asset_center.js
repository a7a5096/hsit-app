document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');

    // Corrected DOM Element IDs to match your HTML
    const totalValueDisplay = document.getElementById('totalValueDisplay'); // Was totalUbtValueDisplay
    const totalUsdEquivalentDisplay = document.getElementById('totalValueInUsd'); // Was totalUsdEquivalentDisplay
    
    // These are for the list item, which we might not strictly need if we only show the total card
    const ubtBalanceInListItem = document.getElementById('ubtBalanceAmount');
    const ubtEstValueInListItem = document.getElementById('ubtEstValue');

    const statusMessageDisplay = document.getElementById('statusMessage'); 

    const UBT_TO_USD_RATE = 1.0; 

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

    async function fetchExchangeRate(pair) { 
        console.log(`AssetCenter: Fetching exchange rate for ${pair}...`);
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`<span class="math-inline">\{API\_URL\}/api/exchange\-rates/</span>{pair}`);
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
            return null; 
        }
    }

    async function fetchAndDisplayTotalUbtBalance() {
        console.log("AssetCenter: Starting fetchAndDisplayTotalUbtBalance...");
        if (!token) {
            showStatusMessage('Authentication token not found. Please log in.', 'error');
            if (totalValueDisplay) totalValueDisplay.textContent = 'Auth Error';
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = 'Equivalent to: $0.00 USD';
            console.log("AssetCenter: No token found.");
            return;
        }

        if (typeof API_URL === 'undefined') {
            showStatusMessage('API configuration is missing. Unable to fetch data.', 'error');
            console.error("AssetCenter: API_URL is not defined.");
            if (totalValueDisplay) totalValueDisplay.textContent = 'Config Error';
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = 'Equivalent to: $0.00 USD';
            return;
        }
        console.log("AssetCenter: API_URL is defined:", API_URL);

        try {
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
            const usdtAmount = parseFloat(balances.usdt) || 0; 
            console.log(`AssetCenter: Parsed balances - UBT: ${ubtAmount}, BTC: ${btcAmount}, ETH: ${ethAmount}, USDT: ${usdtAmount}`);

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

            const ubtFromBtc = btcAmount * btcToUbtRate;
            const ubtFromEth = ethAmount * ethToUbtRate;
            const ubtFromUsdt = usdtAmount * UBT_PER_USDT; 
            console.log(`AssetCenter: UBT equivalents - from BTC: ${ubtFromBtc}, from ETH: ${ubtFromEth}, from USDT: ${ubtFromUsdt}`);

            const totalUbtBalance = ubtAmount + ubtFromBtc + ubtFromEth + ubtFromUsdt;
            const totalUsdValue = totalUbtBalance * UBT_TO_USD_RATE;
            console.log(`AssetCenter: Total UBT Balance calculated: ${totalUbtBalance}, Total USD Value: ${totalUsdValue}`);
            
            // Update the main total display card
            if (totalValueDisplay) {
                console.log("AssetCenter: Updating totalValueDisplay DOM element.");
                totalValueDisplay.textContent = `${totalUbtBalance.toFixed(8)}`; 
            } else {
                console.error("AssetCenter: totalValueDisplay DOM element (ID: totalValueDisplay) not found!");
            }
            if (totalUsdEquivalentDisplay) {
                console.log("AssetCenter: Updating totalUsdEquivalentDisplay DOM element.");
                totalUsdEquivalentDisplay.textContent = `Equivalent to: $${totalUsdValue.toFixed(2)} USD`;
            } else {
                console.error("AssetCenter: totalUsdEquivalentDisplay DOM element (ID: totalValueInUsd) not found!");
            }

            // Also update the UBT list item if it's still part of the simplified display logic
            if (ubtBalanceInListItem) {
                ubtBalanceInListItem.textContent = `${ubtAmount.toFixed(8)} UBT`;
            }
            if (ubtEstValueInListItem) {
                 // If only UBT is shown in the list, its USD value is ubtAmount * UBT_TO_USD_RATE
                ubtEstValueInListItem.textContent = `≈ $${(ubtAmount * UBT_TO_USD_RATE).toFixed(2)} USD`;
            }
            console.log("AssetCenter: DOM updates presumably complete.");

        } catch (error) {
            console.error('AssetCenter: Error in fetchAndDisplayTotalUbtBalance:', error.message, error.stack);
            showStatusMessage(`Error loading asset values: ${error.message}`, 'error');
            if (totalValueDisplay) totalValueDisplay.textContent = 'Error';
            if (totalUsdEquivalentDisplay) totalUsdEquivalentDisplay.textContent = 'Equivalent to: $0.00 USD';
            if (ubtBalanceInListItem) ubtBalanceInListItem.textContent = 'Error UBT';
            if (ubtEstValueIn
