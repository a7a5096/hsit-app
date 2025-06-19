document.addEventListener('DOMContentLoaded', async () => {
    const botsGrid = document.querySelector('.bots-grid');
    const statusMessage = document.getElementById('statusMessage');
    const daysLeftCountdown = document.getElementById('daysLeftCountdown');

    if (!botsGrid) {
        console.error('Products grid not found');
        return;
    }

    // Update countdown timer
    async function updateCountdown() {
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

            if (!response.ok) throw new Error('Failed to fetch countdown data');
            const data = await response.json();
            
            if (daysLeftCountdown) {
                daysLeftCountdown.textContent = data.grandOpeningRemainingDays;
            }
        } catch (error) {
            console.error('Error updating countdown:', error);
        }
    }

    // Initial update
    await updateCountdown();
    // Update every hour to ensure accuracy
    setInterval(updateCountdown, 3600000);

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
                    <p>🎉 Grand Opening Bonus: ${Math.round(bot.price * 0.2)} UBT BONUS</p>
                </div>
            ` : '';

            // Build card content with repositioned More Info and bonus note
            card.innerHTML = `
                <img src="/images/logobots.png" alt="${bot.name}" class="bot-logo-img">
                <button class="btn-more-info" data-bot-id="${bot.id}">More Info</button>
                <div class="product-details">
                    <h3>${bot.name}</h3>
                    <p class="product-description">Advanced AI trading bot with ${bot.dailyCredit} UBT daily returns and ${bot.lockInDays} days lock period.</p>
                </div>
                ${stats}
                ${bonusInfo}
                <button class="btn-buy-bot" data-bot-id="${bot.id}" data-price="${bot.price}">
                    Buy Now - ${bot.price} UBT
                </button>
                <p class="grand-opening-info">* Bonus payment will be credited to your account within 48 hours of purchasing the bot.</p>
            `;

            botsGrid.appendChild(card);
        });

        // Add click handlers for buy buttons
        document.querySelectorAll('.btn-buy-bot').forEach(button => {
            button.addEventListener('click', async (e) => {
                const button = e.target.closest('.btn-buy-bot');
                if (!button) return;
                
                const botId = button.dataset.botId;
                const price = parseFloat(button.dataset.price);
                
                const token = getToken();
                if (!token) return;

                try {
                    console.log('Attempting to purchase bot:', { botId, price });
                    const response = await fetch(`${API_BASE_URL}/api/bots/purchase`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': token
                        },
                        body: JSON.stringify({ botId: parseInt(botId) })
                    });

                    const data = await response.json();
                    console.log('Purchase response:', data);
                    
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
                        showStatus(data.msg || data.message || 'Failed to purchase bot', 'error');
                    }
                } catch (error) {
                    console.error('Purchase error:', error);
                    showStatus('Error processing purchase', 'error');
                }
            });
        });

        // Add click handlers for More Info buttons
        const infoModal = document.getElementById('infoModal');
        const infoDetails = document.getElementById('infoDetails');
        const closeInfoBtn = document.getElementById('closeInfoModal');

        document.querySelectorAll('.btn-more-info').forEach(button => {
            button.addEventListener('click', (e) => {
                const botId = button.dataset.botId;
                const bot = bots.find(b => b.id === parseInt(botId));
                if (!bot) return;
                infoDetails.innerHTML = buildProjectionTable(bot);
                infoModal.style.display = 'block';
            });
        });

        closeInfoBtn.addEventListener('click', () => {
            infoModal.style.display = 'none';
        });

        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) infoModal.style.display = 'none';
        });

        // Build projection table for each day of the bot's run
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
