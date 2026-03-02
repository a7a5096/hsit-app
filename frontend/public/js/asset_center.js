// frontend/public/js/asset_center.js
document.addEventListener('DOMContentLoaded', function() {
    const ubtBalanceAmountEl = document.getElementById('ubtBalanceAmount');
    const totalValueDisplayEl = document.getElementById('totalValueDisplay');
    const totalValueInUsdEl = document.getElementById('totalValueInUsd');

    console.log("Asset Center JS: DOMContentLoaded.");

    // Fetch purchased bots when page loads
    fetchPurchasedBots();

    function updateDisplay(balance) {
        if (ubtBalanceAmountEl) ubtBalanceAmountEl.textContent = `${balance.toFixed(2)} UBT`;
        if (totalValueDisplayEl) totalValueDisplayEl.textContent = balance.toFixed(2);
        if (totalValueInUsdEl) totalValueInUsdEl.textContent = `Equivalent to: $${balance.toFixed(2)} USD`;
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
        updateDisplay(0);
    }
});

async function fetchPurchasedBots() {
    const container = document.querySelector('.purchased-bots-container');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            showBotsError(container, 'Please log in to view your bots.');
            return;
        }

        console.log('Fetching purchased bots from:', `${API_URL}/api/bots/purchased`);
        
        const response = await fetch(`${API_URL}/api/bots/purchased`, {
            headers: {
                'x-auth-token': token
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API response:', data);
        
        if (data.success) {
            displayPurchasedBots(data.bots, data.summary);
        } else {
            console.error('Failed to fetch bots:', data.message);
            showBotsError(container, data.message || 'Failed to load bots.');
        }
    } catch (error) {
        console.error('Error fetching purchased bots:', error);
        showBotsError(container, 'Error loading bots. Please try refreshing the page.');
    }
}

function showBotsError(container, message) {
    if (container) {
        container.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 2rem; color: #ef4444;">
                <p>${message}</p>
                <button onclick="fetchPurchasedBots()" class="btn btn-secondary" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
}

function displayPurchasedBots(bots, summary) {
    const container = document.querySelector('.purchased-bots-container');
    
    if (!container) {
        console.error('Bot container not found!');
        return;
    }
    
    if (!bots || bots.length === 0) {
        container.innerHTML = `
            <div class="empty-bots-message">
                <p>You haven't purchased any bots yet.</p>
                <a href="ai_products.html" class="btn btn-primary">Browse Bots</a>
            </div>
        `;
        return;
    }
    
    console.log('Displaying', bots.length, 'bots');

    // Create table for bot details using server-provided data
    const table = document.createElement('table');
    table.className = 'bot-summary-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Bot</th>
                <th>Paid</th>
                <th>Earned</th>
                <th>Status</th>
                <th>Ends</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    bots.forEach(bot => {
        // All values come directly from the server — no client-side calculation
        const statusLabel = bot.status === 'active' ? 'Started' : 'Completed';
        const statusClass = bot.status === 'active' ? 'status-active' : 'status-completed';
        const endsText = bot.remainingDays > 0 ? `${bot.remainingDays} days` : 'Done';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${bot.name.replace(/UBT/g, '').trim()}</td>
            <td>$${bot.investmentAmount.toFixed(0)}</td>
            <td>$${bot.earned.toFixed(2)}</td>
            <td><span class="bot-status ${statusClass}">${statusLabel}</span></td>
            <td>${endsText}</td>
        `;
        tbody.appendChild(row);
    });

    // Create detailed summary section using server-provided summary
    // Use default values if summary is missing
    const s = summary || {
        totalInvestment: 0,
        totalEarned: 0,
        totalExpectedFuture: 0,
        totalExpectedProfit: 0,
        activeBots: 0,
        completedBots: 0,
        currentROI: 0,
        expectedROI: 0
    };
    
    const summarySection = document.createElement('div');
    summarySection.className = 'bot-detailed-summary';
    summarySection.innerHTML = `
        <h3>Investment Summary</h3>
        <div class="summary-stats">
            <div class="summary-stat">
                <span class="stat-value">$${s.totalInvestment.toFixed(2)}</span>
                <span class="stat-label">Total Investment</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">$${s.totalEarned.toFixed(2)}</span>
                <span class="stat-label">Payments Received</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">$${s.totalExpectedFuture.toFixed(2)}</span>
                <span class="stat-label">Expected Future Payments</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">$${s.totalExpectedProfit.toFixed(2)}</span>
                <span class="stat-label">Total Expected Profit</span>
            </div>
        </div>
        <div class="summary-stats">
            <div class="summary-stat">
                <span class="stat-value">${s.activeBots}</span>
                <span class="stat-label">Active Bots</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${s.completedBots}</span>
                <span class="stat-label">Completed Bots</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${s.currentROI.toFixed(1)}%</span>
                <span class="stat-label">ROI (Current)</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${s.expectedROI.toFixed(1)}%</span>
                <span class="stat-label">ROI (Expected)</span>
            </div>
        </div>
        <p class="info-text">* All values are calculated server-side based on your bot purchase data</p>
    `;

    // Clear container and add new content
    container.innerHTML = '';
    container.appendChild(table);
    container.appendChild(summarySection);
}
