document.addEventListener('DOMContentLoaded', () => {
    const exchangeForm = document.getElementById('exchangeForm');
    const currentRateDisplay = document.getElementById('currentRate');
    const ubtBalanceDisplay = document.getElementById('ubtBalance');
    const usdtBalanceDisplay = document.getElementById('usdtBalance'); // Assuming you track USDT separately
    const fromCurrencySelect = document.getElementById('fromCurrency');
    const fromAmountInput = document.getElementById('fromAmount');
    const toCurrencyDisplay = document.getElementById('toCurrencyDisplay');
    const toAmountInput = document.getElementById('toAmount');
    const exchangeStatusMessage = document.getElementById('exchangeStatusMessage');

    // New elements for withdrawal
    const withdrawalForm = document.getElementById('withdrawalForm');
    const withdrawalUbtBalanceDisplay = document.getElementById('withdrawalUbtBalance');
    const withdrawalAmountInput = document.getElementById('withdrawalAmount');
    const destinationCurrencySelect = document.getElementById('destinationCurrency');
    const destinationAddressInput = document.getElementById('destinationAddress');
    const withdrawalStatusMessage = document.getElementById('withdrawalStatusMessage');

    const token = localStorage.getItem('token');
    let ubtToUsdtRate = null;
    let currentUserUbtBalance = 0;
    // let currentUserUsdtBalance = 0; // If you fetch and display this

    function showStatus(element, message, type = 'info', duration = 5000) {
        if (element) {
            element.textContent = message;
            element.className = `status-message ${type}`;
            element.style.display = 'block';
            setTimeout(() => {
                element.style.display = 'none';
            }, duration);
        } else {
            console.log(`Status (${type}): ${message}`);
        }
    }

    async function fetchUserBalances() {
        if (!token) {
            showStatus(exchangeStatusMessage, 'Please log in to use the exchange.', 'error');
            if (withdrawalStatusMessage) showStatus(withdrawalStatusMessage, 'Please log in to withdraw.', 'error');
            return;
        }
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/auth`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('Failed to fetch user balances.');
            const data = await response.json();

            if (data.success && data.balances) {
                currentUserUbtBalance = parseFloat(data.balances.ubt) || 0;
                // currentUserUsdtBalance = parseFloat(data.balances.usdt) || 0; // If backend provides USDT

                if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                if (withdrawalUbtBalanceDisplay) withdrawalUbtBalanceDisplay.textContent = currentUserUbtBalance.toFixed(2);
                // if (usdtBalanceDisplay) usdtBalanceDisplay.textContent = currentUserUsdtBalance.toFixed(2);
                if (usdtBalanceDisplay) usdtBalanceDisplay.textContent = "N/A"; // Placeholder for now
            } else {
                throw new Error(data.message || 'Could not parse balance data.');
            }
        } catch (error) {
            console.error("Error fetching balances:", error);
            showStatus(exchangeStatusMessage, error.message, 'error');
            if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "Error";
            if (withdrawalUbtBalanceDisplay) withdrawalUbtBalanceDisplay.textContent = "Error";
            if (usdtBalanceDisplay) usdtBalanceDisplay.textContent = "Error";
        }
    }

    async function fetchExchangeRate() {
        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/exchange-rates/ubt-usdt`);
            if (!response.ok) throw new Error('Failed to fetch exchange rate.');
            const data = await response.json();
            if (data.success && data.rate) {
                ubtToUsdtRate = parseFloat(data.rate);
                if (currentRateDisplay) currentRateDisplay.textContent = `1 UBT = ${ubtToUsdtRate.toFixed(4)} USDT`;
                updateConversion();
            } else {
                throw new Error(data.message || 'Invalid rate data.');
            }
        } catch (error) {
            console.error("Error fetching exchange rate:", error);
            if (currentRateDisplay) currentRateDisplay.textContent = "Error loading rate";
            showStatus(exchangeStatusMessage, error.message, 'error');
        }
    }

    function updateConversion() {
        if (!ubtToUsdtRate || !fromAmountInput || !toAmountInput || !fromCurrencySelect || !toCurrencyDisplay) return;

        const amount = parseFloat(fromAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
            toAmountInput.value = '';
            toCurrencyDisplay.value = fromCurrencySelect.value === 'UBT' ? 'USDT' : 'UBT';
            return;
        }

        if (fromCurrencySelect.value === 'UBT') {
            toCurrencyDisplay.value = 'USDT';
            toAmountInput.value = (amount * ubtToUsdtRate).toFixed(4);
        } else { // From USDT
            toCurrencyDisplay.value = 'UBT';
            toAmountInput.value = (amount / ubtToUsdtRate).toFixed(4);
        }
    }

    if (exchangeForm) {
        fromCurrencySelect.addEventListener('change', updateConversion);
        fromAmountInput.addEventListener('input', updateConversion);

        exchangeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!token || !ubtToUsdtRate) {
                showStatus(exchangeStatusMessage, 'Service unavailable. Please try again later.', 'error');
                return;
            }

            const fromCurrency = fromCurrencySelect.value;
            const toCurrency = toCurrencyDisplay.value;
            const amount = parseFloat(fromAmountInput.value);

            if (isNaN(amount) || amount <= 0) {
                showStatus(exchangeStatusMessage, 'Please enter a valid amount.', 'error');
                return;
            }

            // Client-side balance check (example)
            if (fromCurrency === 'UBT' && amount > currentUserUbtBalance) {
                showStatus(exchangeStatusMessage, 'Insufficient UBT balance.', 'error');
                return;
            }
            // Add similar check for USDT if tracked and fetched
            // if (fromCurrency === 'USDT' && amount > currentUserUsdtBalance) { ... }


            try {
                if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
                const response = await fetch(`${API_URL}/api/ubt/exchange`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token,
                    },
                    body: JSON.stringify({ fromCurrency, toCurrency, amount }),
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    showStatus(exchangeStatusMessage, data.message || 'Exchange successful!', 'success');
                    fetchUserBalances(); // Refresh balances
                    fromAmountInput.value = '';
                    toAmountInput.value = '';
                } else {
                    throw new Error(data.message || 'Exchange failed.');
                }
            } catch (error) {
                console.error('Exchange error:', error);
                showStatus(exchangeStatusMessage, error.message, 'error');
            }
        });
    }

    // --- New Withdrawal Logic ---
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!token) {
                showStatus(withdrawalStatusMessage, 'Please log in to request a withdrawal.', 'error');
                return;
            }

            const amount = parseFloat(withdrawalAmountInput.value);
            const destinationCurrency = destinationCurrencySelect.value;
            const destinationAddress = destinationAddressInput.value.trim();

            if (isNaN(amount) || amount <= 0) {
                showStatus(withdrawalStatusMessage, 'Please enter a valid withdrawal amount.', 'error');
                return;
            }
            if (!destinationAddress) {
                showStatus(withdrawalStatusMessage, 'Please enter a destination wallet address.', 'error');
                return;
            }
            if (amount > currentUserUbtBalance) {
                showStatus(withdrawalStatusMessage, 'Withdrawal amount exceeds your UBT balance.', 'error');
                return;
            }
            // Basic address validation (more robust validation should be on backend)
            if (destinationCurrency === 'BTC' && !/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{25,39}$/.test(destinationAddress)) {
                showStatus(withdrawalStatusMessage, 'Invalid Bitcoin address format.', 'error');
                return;
            }
            if ((destinationCurrency === 'ETH' || destinationCurrency === 'USDT') && !/^0x[a-fA-F0-9]{40}$/.test(destinationAddress)) {
                showStatus(withdrawalStatusMessage, `Invalid ${destinationCurrency} address format.`, 'error');
                return;
            }


            const submitButton = withdrawalForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Processing Request...';

            try {
                if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
                const response = await fetch(`${API_URL}/api/ubt/request-withdrawal`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token,
                    },
                    body: JSON.stringify({ amount, destinationCurrency, destinationAddress }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showStatus(withdrawalStatusMessage, data.message || 'Withdrawal request submitted successfully! It will be processed within 48 hours.', 'success');
                    withdrawalForm.reset();
                    fetchUserBalances(); // Refresh UBT balance display
                } else {
                    throw new Error(data.message || 'Withdrawal request failed.');
                }
            } catch (error) {
                console.error('Withdrawal request error:', error);
                showStatus(withdrawalStatusMessage, error.message, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Request Withdrawal';
            }
        });
    }

    // Initial data load
    if (token) {
        fetchUserBalances();
        fetchExchangeRate(); // For the exchange part
    } else {
        if (ubtBalanceDisplay) ubtBalanceDisplay.textContent = "N/A";
        if (withdrawalUbtBalanceDisplay) withdrawalUbtBalanceDisplay.textContent = "N/A";
        if (usdtBalanceDisplay) usdtBalanceDisplay.textContent = "N/A";
        if (currentRateDisplay) currentRateDisplay.textContent = "Log in to see rate";
    }
    // Initialize to/from for exchange
    if (fromCurrencySelect && toCurrencyDisplay) {
        toCurrencyDisplay.value = fromCurrencySelect.value === 'UBT' ? 'USDT' : 'UBT';
    }
});
