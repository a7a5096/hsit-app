document.addEventListener('DOMContentLoaded', async () => {
    const botsGrid = document.querySelector('.bots-grid');
    const statusMessage = document.getElementById('statusMessage');
    const daysLeftCountdown = document.getElementById('daysLeftCountdown');

    if (!botsGrid) {
        console.error('Products grid not found');
        return;
    }

    // Update countdown timer
    function updateCountdown() {
        const endDate = new Date('2024-04-15');
        const now = new Date();
        const diff = endDate - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        daysLeftCountdown.textContent = days;
    }
    updateCountdown();
    setInterval(updateCountdown, 86400000); // Update daily

    // Show status message
    function showStatus(message, type = 'success') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.add('show');
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 3000);
    }

    // Fetch bots data
    try {
        const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
        const response = await fetch(`${API_BASE_URL}/api/bots`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Cache-Control': 'no-cache'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch bots');
        const data = await response.json();
        const bots = data.bots;

        // Render bots
        bots.forEach(bot => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const stats = `
                <div class="product-info-stats">
                    <div>
                        <span>${bot.dailyCredit}%</span>
                        <label>Daily Return</label>
                    </div>
                    <div>
                        <span>${bot.lockInDays}</span>
                        <label>Lock Period</label>
                    </div>
                    <div>
                        <span>${bot.totalReturnAmount}%</span>
                        <label>Total Return</label>
                    </div>
                </div>
            `;

            const bonusInfo = bot.hasBonus ? `
                <div class="bonus-info">
                    <p>🎉 Grand Opening Bonus: ${bot.totalProfit}% Total Profit</p>
                </div>
            ` : '';

            card.innerHTML = `
                <img src="/images/bot-${bot.id}.png" alt="${bot.name}" class="bot-logo-img">
                <div class="product-details">
                    <h3>${bot.name}</h3>
                    <p class="product-description">Advanced AI trading bot with ${bot.dailyCredit}% daily returns and ${bot.lockInDays} days lock period.</p>
                </div>
                ${stats}
                ${bonusInfo}
                <button class="btn-buy-bot" data-bot-id="${bot.id}" data-price="${bot.price}">
                    Buy Now - ${bot.price} UBT
                </button>
            `;

            botsGrid.appendChild(card);
        });

        // Add click handlers for buy buttons
        document.querySelectorAll('.btn-buy-bot').forEach(button => {
            button.addEventListener('click', async (e) => {
                const botId = e.target.dataset.botId;
                const price = parseFloat(e.target.dataset.price);
                
                try {
                    const response = await fetch(`${API_BASE_URL}/api/bots/purchase`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ botId, price })
                    });

                    const data = await response.json();
                    
                    if (response.ok) {
                        showStatus('Bot purchased successfully! 🎉');
                        setTimeout(() => window.location.href = '/dashboard.html', 2000);
                    } else {
                        showStatus(data.message || 'Failed to purchase bot', 'error');
                    }
                } catch (error) {
                    showStatus('Error processing purchase', 'error');
                }
            });
        });

    } catch (error) {
        console.error('Error:', error);
        showStatus('Failed to load bots', 'error');
    }
});
