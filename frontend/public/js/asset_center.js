// frontend/public/js/asset_center.js
document.addEventListener('DOMContentLoaded', function() {
    const ubtBalanceAmountEl = document.getElementById('ubtBalanceAmount'); // In your HTML: <span class="asset-amount" id="ubtBalanceAmount">
    const totalValueDisplayEl = document.getElementById('totalValueDisplay');   // In your HTML: <span id="totalValueDisplay">
    const totalValueInUsdEl = document.getElementById('totalValueInUsd');       // In your HTML: <p class="info-text" id="totalValueInUsd">

    console.log("Asset Center JS: DOMContentLoaded.");

    // Fetch purchased bots when page loads
    fetchPurchasedBots();

    function updateDisplay(balance) {
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = `${balance.toFixed(2)} UBT`;
        if (totalValueDisplayEl) totalValueDisplayEl.textContent = balance.toFixed(2);
        if (totalValueInUsdEl) totalValueInUsdEl.textContent = `Equivalent to: $${balance.toFixed(2)} USD`; // Assuming 1 UBT = 1 USD
    }

    document.addEventListener('balanceUpdated', (e) => {
        const newBalance = e.detail.newBalance;
        console.log(`Asset Center JS: Heard 'balanceUpdated' event! New balance: ${newBalance}`);
        updateDisplay(newBalance);
    });

    document.addEventListener('balanceError', (e) => {
        console.error(`Asset Center JS: Heard 'balanceError' event! Message: ${e.detail.message}`);
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = 'Error';
        if (totalValueDisplayEl) totalValueDisplayEl.textContent = 'Error';
        if (totalValueInUsdEl) totalValueInUsdEl.textContent = 'Equivalent to: Error';
    });

    if (typeof balanceManager !== 'undefined') {
        console.log("Asset Center JS: Page loaded, telling balanceManager to initialize.");
        balanceManager.init(); 
    } else {
        console.error("Asset Center JS: balanceManager is not defined!");
        updateDisplay(0); // Show 0 or error if balanceManager isn't there
    }
});

async function fetchPurchasedBots() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            return;
        }

        const response = await fetch(`${API_URL}/api/bots/purchased`, {
            headers: {
                'x-auth-token': token
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            updatePurchasedBots(data.bots);
        } else {
            console.error('Failed to fetch bots:', data.message);
        }
    } catch (error) {
        console.error('Error fetching purchased bots:', error);
    }
}

async function updatePurchasedBots(bots) {
    const container = document.querySelector('.purchased-bots-container');
    const emptyMessage = container.querySelector('.empty-bots-message');
    
    if (!bots || bots.length === 0) {
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';

    // Create table for bot details
    const table = document.createElement('table');
    table.className = 'bot-summary-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Bot Name</th>
                <th>Paid</th>
                <th>Earned</th>
                <th></th>
                <th>Remaining Days</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    let totalInvestment = 0;
    let totalPaymentsReceived = 0;
    let totalExpectedPayments = 0;
    let activeBots = 0;
    let completedBots = 0;

    bots.forEach(bot => {
        // Use new fields if present, fallback to old
        const purchaseDate = bot.purchaseDate ? new Date(bot.purchaseDate) : (bot.purchaseDate ? new Date(bot.purchaseDate) : new Date());
        const investment = typeof bot.investmentAmount === 'number' ? bot.investmentAmount : (typeof bot.price === 'number' ? bot.price : 0);
        const daysActive = calculateDaysActive(purchaseDate);
        const totalDays = bot.lockInDays || bot.lockPeriod || 365; // fallback to 1 year if not present
        const remainingDays = Math.max(0, totalDays - daysActive);
        const status = remainingDays > 0 ? 'Active' : 'Completed';
        const paymentsReceived = calculateBonusPayments(bot, daysActive, investment, totalDays);
        const expectedPayments = calculateRemainingBonusPayments(bot, daysActive, investment, totalDays);

        totalInvestment += investment;
        totalPaymentsReceived += paymentsReceived;
        totalExpectedPayments += expectedPayments;
        
        if (status === 'Active') activeBots++;
        else completedBots++;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${bot.name.replace(/UBT/g, '').trim()}</td>
            <td>$${investment.toFixed(0)}</td>
            <td>$${paymentsReceived.toFixed(2)}</td>
            <td><span class="bot-status status-${status.toLowerCase()}">${status === 'Active' ? 'Started' : 'Completed'}</span></td>
            <td>${remainingDays}</td>
        `;
        tbody.appendChild(row);
    });

    // Create detailed summary section
    const summary = document.createElement('div');
    summary.className = 'bot-detailed-summary';
    summary.innerHTML = `
        <h3>Investment Summary</h3>
        <div class="summary-stats">
            <div class="summary-stat">
                <span class="stat-value">$${totalInvestment.toFixed(2)}</span>
                <span class="stat-label">Total Investment</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">$${totalPaymentsReceived.toFixed(2)}</span>
                <span class="stat-label">Payments Received</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">$${totalExpectedPayments.toFixed(2)}</span>
                <span class="stat-label">Expected Future Payments</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">$${(totalPaymentsReceived + totalExpectedPayments - totalInvestment).toFixed(2)}</span>
                <span class="stat-label">Total Expected Profit</span>
            </div>
        </div>
        <div class="summary-stats">
            <div class="summary-stat">
                <span class="stat-value">${activeBots}</span>
                <span class="stat-label">Active Bots</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${completedBots}</span>
                <span class="stat-label">Completed Bots</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${((totalPaymentsReceived / totalInvestment) * 100).toFixed(1)}%</span>
                <span class="stat-label">ROI (Current)</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${(((totalPaymentsReceived + totalExpectedPayments) / totalInvestment) * 100).toFixed(1)}%</span>
                <span class="stat-label">ROI (Expected)</span>
            </div>
        </div>
        <p class="info-text">* Expected future payments are calculated based on remaining days and current performance</p>
    `;

    // Clear container and add new content
    container.innerHTML = '';
    container.appendChild(table);
    container.appendChild(summary);
}

function calculateDaysActive(purchaseDate) {
    const purchase = new Date(purchaseDate);
    const now = new Date();
    const diffTime = Math.abs(now - purchase);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateBonusPayments(bot, daysActive, investment, totalDays) {
    // Use bot-specific logic if available, fallback to generic
    const dailyPayment = bot.dailyCredit || bot.dailyPayment || investment * 0.003;
    return Math.min(daysActive * dailyPayment, investment * 1.5); // Cap at 150% of investment
}

function calculateRemainingBonusPayments(bot, daysActive, investment, totalDays) {
    const remainingDays = Math.max(0, totalDays - daysActive);
    const dailyPayment = bot.dailyCredit || bot.dailyPayment || investment * 0.003;
    const totalExpected = investment * 1.5;
    const currentPayments = calculateBonusPayments(bot, daysActive, investment, totalDays);
    return Math.max(0, totalExpected - currentPayments);
}
