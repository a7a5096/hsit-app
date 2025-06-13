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
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + 24); // Set end date to 24 days from now
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

    // Get fresh token and validate it
    function getToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            showStatus('Please log in to continue', 'error');
            setTimeout(() => window.location.href = '/login', 2000);
            return null;
        }
        return token;
    }

    // Fetch bots data
    try {
        const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/bots`, {
            headers: {
                'x-auth-token': token,
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token'); // Clear invalid token
            showStatus('Session expired. Please log in again.', 'error');
            setTimeout(() => window.location.href = '/login', 2000);
            return;
        }
        
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
                        <span>${bot.dailyCredit} UBT</span>
                        <label>Daily Return</label>
                    </div>
                    <div>
                        <span>${bot.lockInDays}</span>
                        <label>Lock Period</label>
                    </div>
                    <div>
                        <span>${bot.totalReturnAmount} UBT</span>
                        <label>Total Return</label>
                    </div>
                </div>
            `;

            const bonusInfo = bot.hasBonus ? `
                <div class="bonus-info">
                    <p>🎉 Grand Opening Bonus: ${bot.totalProfit} UBT BONUS</p>
                </div>
            ` : '';

            card.innerHTML = `
                <img src="/images/logobots.png" alt="${bot.name}" class="bot-logo-img">
                <div class="product-details">
                    <h3>${bot.name}</h3>
                    <p class="product-description">Advanced AI trading bot with ${bot.dailyCredit} UBT daily returns and ${bot.lockInDays} days lock period.</p>
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
                
                const token = getToken();
                if (!token) return;

                try {
                    const response = await fetch(`${API_BASE_URL}/api/bots/purchase`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify({ botId })
                    });

                    const data = await response.json();
                    
                    if (response.status === 401) {
                        localStorage.removeItem('token'); // Clear invalid token
                        showStatus('Session expired. Please log in again.', 'error');
                        setTimeout(() => window.location.href = '/login', 2000);
                        return;
                    }
                    
                    if (response.ok) {
                        showStatus('Bot purchased successfully! 🎉');
                        setTimeout(() => window.location.href = '/dashboard', 2000);
                    } else {
                        showStatus(data.message || 'Failed to purchase bot', 'error');
                    }
                } catch (error) {
                    console.error('Purchase error:', error);
                    showStatus('Error processing purchase', 'error');
                }
            });
        });

    } catch (error) {
        console.error('Error:', error);
        showStatus('Failed to load bots', 'error');
    }
});
