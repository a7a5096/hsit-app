/**
 * Balance display component
 * 
 * This file handles the display of UBT balances across different sections of the application.
 * It ensures that only UBT balances are shown, never the raw crypto balances.
 */

// Initialize balance display when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Balance display component loaded');
    
    // Check if user is authenticated
    if (!isAuthenticated()) {
        console.log('User not authenticated, skipping balance display');
        return;
    }
    
    // Load and display UBT balance in all relevant sections
    loadUBTBalance();
});

/**
 * Load UBT balance from API and update all balance display elements
 */
function loadUBTBalance() {
    console.log('Loading UBT balance');
    
    // Get auth token
    const token = getAuthToken();
    if (!token) {
        console.error('No auth token found');
        return;
    }
    
    // Fetch balance from API
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://hsit-backend.onrender.com/api/deposit/balance', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('x-auth-token', token);
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    updateBalanceDisplays(data.ubtBalance, data.currentRate);
                } catch (e) {
                    console.error('Error parsing balance response:', e);
                }
            } else {
                console.error(`Failed to load balance (Status: ${xhr.status})`);
            }
        }
    };
    
    xhr.send();
}

/**
 * Update all balance display elements with the current UBT balance
 * @param {number} balance - The UBT balance
 * @param {number} rate - The current UBT exchange rate
 */
function updateBalanceDisplays(balance, rate) {
    console.log(`Updating balance displays: ${balance} UBT at rate ${rate}`);
    
    // Format balance for display
    const formattedBalance = balance.toFixed(2);
    const formattedRate = rate.toFixed(4);
    
    // Update all balance display elements
    updateElementsWithClass('ubt-balance', `${formattedBalance} UBT`);
    updateElementsWithClass('ubt-rate', `1 UBT = ${formattedRate} USDT`);
    
    // Update specific section balances if they exist
    updateSectionBalance('asset-center-balance', formattedBalance);
    updateSectionBalance('ai-bot-balance', formattedBalance);
    updateSectionBalance('my-team-balance', formattedBalance);
    updateSectionBalance('spinning-wheel-balance', formattedBalance);
}

/**
 * Update all elements with a specific class
 * @param {string} className - The class name to target
 * @param {string} value - The value to set
 */
function updateElementsWithClass(className, value) {
    const elements = document.getElementsByClassName(className);
    for (let i = 0; i < elements.length; i++) {
        elements[i].textContent = value;
    }
}

/**
 * Update balance in a specific section if the element exists
 * @param {string} id - The element ID
 * @param {string} formattedBalance - The formatted balance
 */
function updateSectionBalance(id, formattedBalance) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = `${formattedBalance} UBT`;
    }
}

/**
 * Refresh UBT balance (can be called after transactions)
 */
function refreshUBTBalance() {
    loadUBTBalance();
}
