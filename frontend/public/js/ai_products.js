document.addEventListener('DOMContentLoaded', async () => {
    const botsGrid = document.querySelector('.bots-grid');
    const statusMessage = document.getElementById('statusMessage');
    const daysLeftCountdown = document.getElementById('daysLeftCountdown');

    const purchaseModal = document.getElementById('purchaseModal');
    const purchaseDetails = document.getElementById('purchaseDetails');
    const confirmPurchaseBtn = document.getElementById('confirmPurchaseBtn');
    const cancelPurchaseBtn = document.getElementById('cancelPurchaseBtn');

    if (!botsGrid) {
        console.error('Products grid not found');
        return;
    }

    let allBots = [];
    let pendingPurchaseBotId = null;

    async function updateCountdown() {
        try {
            const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/bots`, {
                headers: { 'x-auth-token': token, 'Cache-Control': 'no-cache' }
            });
            if (!response.ok) throw new Error('Failed to fetch countdown data');
            const data = await response.json();
            if (daysLeftCountdown) daysLeftCountdown.textContent = data.grandOpeningRemainingDays;
        } catch (error) {
            console.error('Error updating countdown:', error);
        }
    }

    await updateCountdown();
    setInterval(updateCountdown, 3600000);

    function showStatus(message, type = 'success') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.add('show');
        setTimeout(() => { statusMessage.classList.remove('show'); }, 3000);
    }

    function getToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            showStatus('Please log in to continue', 'error');
            setTimeout(() => window.location.href = '/login', 2000);
            return null;
        }
        return token;
    }

    function showPurchaseConfirmation(bot) {
        if (!purchaseModal || !purchaseDetails) return;

        const bonusAmount = bot.springBonusAmount || Math.round(bot.price * 0.2);
        const bonusLine = bot.hasBonus
            ? `<div class="confirm-row"><span>Spring Bonus</span><span style="color:#10b981;">+${bonusAmount} UBT</span></div>`
            : '';

        purchaseDetails.innerHTML = `
            <div style="margin-bottom:1.5rem;">
                <p style="color:#666;margin-bottom:1rem;">You are about to purchase:</p>
                <h3 style="color:#1a1a2e;margin-bottom:0.5rem;">${bot.name}</h3>
                <div style="background:#f8f9fa;border-radius:12px;padding:1rem;margin-top:1rem;">
                    <div class="confirm-row"><span>Cost</span><span>${bot.price} UBT</span></div>
                    <div class="confirm-row"><span>Daily Return</span><span>${bot.dailyCredit} UBT/day</span></div>
                    <div class="confirm-row"><span>Lock Period</span><span>${bot.lockInDays} days</span></div>
                    <div class="confirm-row"><span>Total Return</span><span>${bot.totalReturnAmount} UBT</span></div>
                    ${bonusLine}
                </div>
                <p style="font-size:0.85rem;color:#888;margin-top:1rem;">
                    By confirming, you agree to the <a href="terms.html" target="_blank" style="color:#00b8ff;">Terms &amp; Conditions</a>.
                    Your UBT balance will be debited immediately.
                </p>
            </div>
        `;

        pendingPurchaseBotId = bot.id;
        purchaseModal.style.display = 'block';
    }

    async function executePurchase(botId) {
        const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
        const token = getToken();
        if (!token) return;

        confirmPurchaseBtn.disabled = true;
        confirmPurchaseBtn.textContent = 'Processing...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/bots/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ botId: parseInt(botId) })
            });

            const data = await response.json();

            if (response.status === 401) {
                localStorage.removeItem('token');
                showStatus('Session expired. Please log in again.', 'error');
                setTimeout(() => window.location.href = '/login', 2000);
                return;
            }

            purchaseModal.style.display = 'none';

            if (response.ok) {
                showStatus(data.msg || 'Bot purchased successfully!', 'success');
                setTimeout(() => window.location.href = '/dashboard', 2000);
            } else {
                showStatus(data.msg || data.message || 'Failed to purchase bot', 'error');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            showStatus('Error processing purchase', 'error');
            purchaseModal.style.display = 'none';
        } finally {
            confirmPurchaseBtn.disabled = false;
            confirmPurchaseBtn.textContent = 'Confirm Purchase';
            pendingPurchaseBotId = null;
        }
    }

    if (confirmPurchaseBtn) {
        confirmPurchaseBtn.addEventListener('click', () => {
            if (pendingPurchaseBotId != null) executePurchase(pendingPurchaseBotId);
        });
    }

    if (cancelPurchaseBtn) {
        cancelPurchaseBtn.addEventListener('click', () => {
            purchaseModal.style.display = 'none';
            pendingPurchaseBotId = null;
        });
    }

    if (purchaseModal) {
        purchaseModal.addEventListener('click', (e) => {
            if (e.target === purchaseModal) {
                purchaseModal.style.display = 'none';
                pendingPurchaseBotId = null;
            }
        });
    }

    // Fetch and render bots
    try {
        const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/bots`, {
            headers: { 'x-auth-token': token, 'Cache-Control': 'no-cache' }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            showStatus('Session expired. Please log in again.', 'error');
            setTimeout(() => window.location.href = '/login', 2000);
            return;
        }

        if (!response.ok) throw new Error('Failed to fetch bots');
        const data = await response.json();
        allBots = data.bots;

        allBots.forEach(bot => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const stats = `
                <div class="product-info-stats">
                    <div><span>${bot.dailyCredit} UBT</span><label>Daily Return</label></div>
                    <div><span>${bot.lockInDays}</span><label>Lock Period</label></div>
                    <div><span>${bot.totalReturnAmount} UBT</span><label>Total Return</label></div>
                </div>`;

            const bonusAmount = bot.springBonusAmount || Math.round(bot.price * 0.2);
            const bonusInfo = bot.hasBonus ? `
                <div class="bonus-info"><p>🌸 Spring Bonus: ${bonusAmount} UBT BONUS</p></div>` : '';

            card.innerHTML = `
                <img src="/images/logobots.png" alt="${bot.name}" class="bot-logo-img">
                <button class="btn-more-info" data-bot-id="${bot.id}">More Info</button>
                <div class="product-details">
                    <h3>${bot.name}</h3>
                    <p class="product-description">Advanced AI trading bot with ${bot.dailyCredit} UBT daily returns and ${bot.lockInDays} days lock period.</p>
                </div>
                ${stats}
                ${bonusInfo}
                <button class="btn-buy-bot" data-bot-id="${bot.id}" data-price="${bot.price}">Buy Now - ${bot.price} UBT</button>
                ${bot.hasBonus ? '<p class="grand-opening-info">* Spring bonus payments are credited immediately upon bot purchase.</p>' : ''}`;

            botsGrid.appendChild(card);
        });

        document.querySelectorAll('.btn-buy-bot').forEach(button => {
            button.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-buy-bot');
                if (!btn) return;
                const botId = parseInt(btn.dataset.botId);
                const bot = allBots.find(b => b.id === botId);
                if (bot) showPurchaseConfirmation(bot);
            });
        });

        // More Info modal
        const infoModal = document.getElementById('infoModal');
        const infoDetails = document.getElementById('infoDetails');
        const closeInfoBtn = document.getElementById('closeInfoModal');

        document.querySelectorAll('.btn-more-info').forEach(button => {
            button.addEventListener('click', () => {
                const botId = button.dataset.botId;
                const bot = allBots.find(b => b.id === parseInt(botId));
                if (!bot) return;
                infoDetails.innerHTML = buildProjectionTable(bot);
                infoModal.style.display = 'block';
            });
        });

        closeInfoBtn.addEventListener('click', () => { infoModal.style.display = 'none'; });
        infoModal.addEventListener('click', (e) => { if (e.target === infoModal) infoModal.style.display = 'none'; });

        function buildProjectionTable(bot) {
            const investment = bot.price || 0;
            const dailyCredit = bot.dailyCredit || 0;
            const totalDays = bot.lockInDays || 0;
            let html = '<table class="bot-summary-table"><thead><tr><th>Day</th><th>Paid</th><th>Earned</th><th>Status</th><th>Ends In</th></tr></thead><tbody>';
            for (let day = 1; day <= totalDays; day++) {
                const earned = dailyCredit * day;
                const remainingDays = totalDays - day;
                const status = remainingDays > 0 ? 'Active' : 'Completed';
                html += `<tr><td>Day ${day}</td><td>${investment.toFixed(0)}</td><td>${earned.toFixed(2)}</td><td><span class="bot-status status-${status.toLowerCase()}">${status}</span></td><td>${remainingDays} days</td></tr>`;
            }
            html += '</tbody></table>';
            return html;
        }

    } catch (error) {
        console.error('Error:', error);
        showStatus('Failed to load bots', 'error');
    }
});
