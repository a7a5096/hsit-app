document.addEventListener('DOMContentLoaded', function() {
    const productsGrid = document.querySelector('.products-grid');
    const statusMessage = document.getElementById('statusMessage'); // For general messages
    
    // Ensure API_URL is defined (e.g., from config.js)
    const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
    let currentGlobalBonusPercent = 100; // Default or will be updated from API

    function showStatusMessage(message, type = 'info') {
        if (!statusMessage) return;
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`; // Ensure you have CSS for .success, .error, .info
        statusMessage.style.display = 'block';
        setTimeout(() => { statusMessage.style.display = 'none'; }, 5000);
    }

    async function fetchProducts() {
        if (!productsGrid) {
            console.error("Products grid not found.");
            return;
        }
        productsGrid.innerHTML = '<p>Loading AI products...</p>'; // Loading message

        try {
            const response = await fetch(`${API_BASE_URL}/api/bots`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Failed to fetch products. Status: ${response.status}`);
            }
            const data = await response.json();

            if (data.success && data.bots) {
                currentGlobalBonusPercent = data.globalBonusCountdownPercent;
                renderProducts(data.bots, currentGlobalBonusPercent);
            } else {
                throw new Error(data.message || 'Could not load products data.');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            productsGrid.innerHTML = `<p style="color:red;">Error loading products: ${error.message}</p>`;
        }
    }

    function renderProducts(bots, bonusCountdownPercent) {
        productsGrid.innerHTML = ''; // Clear loading message or old cards

        if (!bots || bots.length === 0) {
            productsGrid.innerHTML = '<p>No AI products available at the moment.</p>';
            return;
        }

        bots.forEach(bot => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Extract details, providing defaults
            const botName = bot.name || 'N/A Bot';
            const dailyReturn = bot.dailyReturn || (bot.cost === 100 ? 10 : (bot.cost === 500 ? 10 : (bot.cost === 3000 ? 10 : (bot.cost === 10000 ? 15 : 100)))); // Inferring from original HTML logic
            const lockPeriod = bot.cycleDays || (bot.cost === 100 ? 2 : (bot.cost === 500 ? 14 : (bot.cost === 3000 ? 30 : (bot.cost === 10000 ? 100 : 300))));
            const cost = bot.cost || 0;
            const description = bot.description || 'No description available.';
            const offersBonus = bot.offersBonus || false; // From backend bots.js
            const bonusPayment = bot.bonusPayment || 0;  // From backend bots.js

            // Example: Deriving features string or using a dedicated field from backend
            let featuresHTML = '';
            if (bot.features && Array.isArray(bot.features)) {
                featuresHTML = bot.features.map(feature => `<li>${feature}</li>`).join('');
            } else {
                // Fallback or use specific details from bot object
                featuresHTML = `
                    <li><strong>Lock-in Period:</strong> ${lockPeriod} days</li>
                    <li><strong>Daily Profit:</strong> ${dailyReturn} UBT</li>
                    <li><strong>Principal Return:</strong> After ${lockPeriod} days</li>
                    <li><strong>Bonus Payment:</strong> ${offersBonus && bonusCountdownPercent > 0 ? `${bonusPayment} UBT` : 'N/A'}</li>
                `;
            }


            card.innerHTML = `
                <div class="product-logo logo-${String(botName).toLowerCase().split(' ')[0] || 'default'}">${botName.split(' ').map(w=>w[0]).join('') || 'B'}</div>
                <div class="product-info-stats">
                    <div><span>${dailyReturn} UBT</span><label>Daily</label></div>
                    <div><span>${lockPeriod} days</span><label>Lock</label></div>
                    <div><span>${cost} UBT</span><label>Cost</label></div>
                </div>
                <div class="product-details">
                    <h3>${botName}</h3>
                    <p class="product-description">${description}</p>
                    ${offersBonus && bonusPayment > 0 && bonusCountdownPercent > 0 ? `<div class="bonus-info" style="color: #50fa7b; text-align:center; margin-bottom:10px; font-weight:bold;">Bonus Reward: ${bonusPayment} UBT</div>` : ''}
                </div>
                
                <div class="bonus-countdown-container" style="display: ${offersBonus && bonusCountdownPercent > 0 ? 'block' : 'none'};">
                    <p class="bonus-countdown-text">${bonusCountdownPercent > 0 ? 'Limited Time Bonus Offer!' : 'Bonus Expired'}</p>
                    <div class="countdown-bar-outer">
                        <div class="countdown-bar-inner" style="width: ${bonusCountdownPercent}%;"></div>
                    </div>
                    <p class="countdown-percent-text">${bonusCountdownPercent > 0 ? bonusCountdownPercent.toFixed(0) + '% remaining' : ''}</p>
                </div>
                
                <button class="btn btn-primary full-width btn-buy-bot" data-bot-id="${bot.id || bot._id}" ${bonusCountdownPercent <= 0 && offersBonus ? 'disabled' : ''}>
                    ${bonusCountdownPercent > 0 && offersBonus ? `Buy with Bonus (${cost} UBT)` : `Buy Bot (${cost} UBT)`}
                </button>
            `;
            
            const innerBar = card.querySelector('.countdown-bar-inner');
            if (innerBar && offersBonus) {
                if (bonusCountdownPercent <= 0) {
                    innerBar.style.backgroundColor = '#555';
                    innerBar.style.width = '100%'; // Show full grey bar for expired
                    // card.querySelector('.bonus-countdown-text').textContent = 'Bonus Expired';
                    card.querySelector('.countdown-percent-text').textContent = '';
                    // card.querySelector('.btn-buy-bot').disabled = true; // Disable buy if bonus was the only reason
                } else if (bonusCountdownPercent < 25) {
                    innerBar.classList.add('very-low'); // CSS will color this red
                } else if (bonusCountdownPercent < 50) {
                    innerBar.classList.add('low'); // CSS will color this orange
                }
            }
            productsGrid.appendChild(card);
        });

        document.querySelectorAll('.btn-buy-bot').forEach(button => {
            button.addEventListener('click', handleBuyBot);
        });
    }

    async function handleBuyBot(event) {
        const botId = event.target.dataset.botId;
        const token = localStorage.getItem('token');

        if (!token) {
            showStatusMessage('Please log in to purchase a bot.', 'error');
            // Optionally redirect to login: window.location.href = 'index.html';
            return;
        }

        const botCard = event.target.closest('.product-card');
        const botName = botCard.querySelector('h3').textContent;
        const botCostText = botCard.querySelector('.product-info-stats div:nth-child(3) span').textContent; // "100 UBT"


        if (!confirm(`Are you sure you want to purchase the ${botName} for ${botCostText}?`)) {
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
                body: JSON.stringify({ botId: botId })
            });
            const result = await response.json();

            if (result.success) {
                showStatusMessage(result.msg || 'Bot purchased successfully!', 'success');
                // Update balance using balanceManager if it's integrated
                if (balanceManager && typeof result.newBalance === 'number') {
                     balanceManager.updateBalance(result.newBalance);
                }
                // If the purchase response contains the new global bonus percentage, use it.
                // Otherwise, re-fetch all products to update the bars.
                if (typeof result.globalBonusCountdownPercent === 'number') {
                    currentGlobalBonusPercent = result.globalBonusCountdownPercent;
                    // We need to re-render or update existing cards. For simplicity, re-fetch.
                    fetchProducts();
                } else {
                    fetchProducts(); // Re-fetch products to update all countdown bars
                }
            } else {
                throw new Error(result.msg || 'Purchase failed.');
            }
        } catch (error) {
            console.error('Purchase error:', error);
            showStatusMessage(`Purchase failed: ${error.message}`, 'error');
        } finally {
             // Re-enable the button on the specific card if it still exists
             const specificButton = document.querySelector(`.btn-buy-bot[data-bot-id="${botId}"]`);
             if(specificButton) {
                specificButton.disabled = false;
                specificButton.textContent = specificButton.textContent.replace('Processing...', `Buy Now (${botCostText.split(' ')[0]} UBT)`);
             }
        }
    }

    // Add listener for UBT balance updates if balanceManager is used
    if (typeof balanceManager !== 'undefined') {
        document.addEventListener('balanceUpdated', (e) => {
            // console.log('AI Products: Balance updated event received', e.detail.newBalance);
            // Potentially refresh product button states if they depend on balance for enabling/disabling
            // This is more complex if cards are already rendered, as you'd need to iterate them.
            // For now, fetchProducts() after purchase handles re-rendering.
        });
    }

    fetchProducts(); // Initial load of products
});
