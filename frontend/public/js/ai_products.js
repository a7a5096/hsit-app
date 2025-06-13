document.addEventListener('DOMContentLoaded', function() {
    const productsGrid = document.querySelector('.products-grid');
    const statusMessage = document.getElementById('statusMessage');

    const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';

    // Function to calculate days left until a specific offer end date
    function calculateDaysLeft() {
        const offerEndDate = new Date('2025-06-21T00:00:00Z'); // Fixed end date for Grand Opening Offer (June 21, 2025)
        const now = new Date();
        const diffTime = offerEndDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays); // Ensure it doesn't go below 0
    }

    // --- REMOVE: Hardcoded and Combined Bot Data (Sorted by Price) ---
    // const ALL_BOTS_DATA = [...];

    let ALL_BOTS_DATA = [];

    async function fetchBotsFromBackend() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/bots`, {
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            });
            const data = await response.json();
            if (data.success && Array.isArray(data.bots)) {
                ALL_BOTS_DATA = data.bots;
                renderProducts(ALL_BOTS_DATA);
            } else {
                showStatusMessage('Failed to load bots from backend.', 'error');
            }
        } catch (err) {
            showStatusMessage('Error loading bots from backend.', 'error');
        }
    }

    function showStatusMessage(message, type = 'info') {
        if (!statusMessage) return;
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        setTimeout(() => { statusMessage.style.display = 'none'; }, 5000);
    }

    // --- LIVE COUNTDOWN TIMER ---
    let countdownInterval = null;

    function startLiveCountdown() {
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            document.querySelectorAll('.days-left-countdown').forEach(el => {
                const offerEndDate = new Date('2025-06-21T00:00:00Z');
                const now = new Date();
                const diffTime = offerEndDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                el.textContent = `${Math.max(0, diffDays)} Days Left`;
            });
        }, 60000); // update every minute
    }

    function renderProducts(botsToRender) {
        if (!productsGrid) {
            console.error("Products grid not found.");
            return;
        }
        productsGrid.innerHTML = '';
        if (!botsToRender || botsToRender.length === 0) {
            productsGrid.innerHTML = '<p>No AI products available at the moment.</p>';
            return;
        }
        botsToRender.forEach(bot => {
            const card = document.createElement('div');
            const isGrandOpeningOffer = bot.isGrandOpeningOffer || false;
            let daysLeft = 0;
            if (isGrandOpeningOffer) {
                daysLeft = calculateDaysLeft();
                card.classList.add('grand-opening-card');
            }
            card.className = 'product-card';
            const botName = bot.name || 'N/A Bot';
            const dailyCredit = bot.dailyCredit || 0;
            const lockInDays = bot.lockInDays || 0;
            const price = bot.price || 0;
            const specialFeature = bot.specialFeature || 'No special features.';
            const hasBonus = bot.hasBonus || false;
            const bonusCreditAmount = bot.bonusCreditAmount || 0;
            const bonusCreditInterval = bot.bonusCreditInterval || '';
            card.innerHTML = `
                <img src="images/logobots.png" alt="HSIT Bot Logo" class="bot-logo-img">
                <div class="product-info-stats">
                    <div><span>${dailyCredit} UBT</span><label>Daily</label></div>
                    <div><span>${lockInDays} days</span><label>Lock</label></div>
                    <div><span>${price} UBT</span><label>Cost</label></div>
                </div>
                <div class="product-details">
                    <h3>${botName}</h3>
                    <p class="product-description">${specialFeature}</p>
                    ${hasBonus && bonusCreditAmount > 0 ? `
                        <div class="bonus-info" style="color: #50fa7b; text-align:center; margin-bottom:10px; font-weight:bold;">
                            Bonus Reward: ${bonusCreditAmount.toFixed(2)} UBT (${bonusCreditInterval})
                        </div>` : ''
                    }
                </div>
                ${isGrandOpeningOffer && daysLeft > 0 ? `
                <div class="grand-opening-banner">
                    <span class="grand-opening-text">GRAND OPENING OFFER!</span>
                    <span class="days-left-countdown">${daysLeft} Days Left</span>
                </div>
                ` : ''}
                <button class="btn btn-primary full-width btn-buy-bot" data-bot-id="${bot.id}" data-bot-price="${price}">
                    Buy Bot (${price} UBT)
                </button>
            `;
            productsGrid.appendChild(card);
        });
        document.querySelectorAll('.btn-buy-bot').forEach(button => {
            button.addEventListener('click', handleBuyBot);
        });
        startLiveCountdown();
    }

    async function handleBuyBot(event) {
        const botId = event.target.dataset.botId;
        const token = localStorage.getItem('token');
        if (!token) {
            showStatusMessage('Please log in to purchase a bot.', 'error');
            return;
        }
        const botCard = event.target.closest('.product-card');
        const botName = botCard.querySelector('h3').textContent;
        const botPrice = botCard.querySelector('.product-info-stats div:nth-child(3) span').textContent.replace(' UBT', '');
        if (!confirm(`Are you sure you want to purchase the ${botName} for ${botPrice} UBT?`)) {
            return;
        }
        event.target.disabled = true;
        event.target.textContent = 'Processing...';
        try {
            const response = await fetch(`${API_BASE_URL}/api/bots/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ botId: botId }) // Only send botId
            });
            const result = await response.json();
            if (result.success) {
                showStatusMessage(result.msg || 'Bot purchased successfully!', 'success');
                if (typeof balanceManager !== 'undefined' && typeof result.newBalance === 'number') {
                     balanceManager.updateBalance(result.newBalance);
                }
                renderProducts(ALL_BOTS_DATA);
            } else {
                throw new Error(result.msg || 'Purchase failed.');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            showStatusMessage(`Purchase failed: ${error.message}`, 'error');
        } finally {
             const specificButton = document.querySelector(`.btn-buy-bot[data-bot-id="${botId}"]`);
             if(specificButton) {
                specificButton.disabled = false;
                specificButton.textContent = `Buy Bot (${botPrice} UBT)`;
             }
        }
    }

    // Replace initial render with backend fetch
    fetchBotsFromBackend();
});
