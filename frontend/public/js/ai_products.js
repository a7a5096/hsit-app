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

    // --- START: Hardcoded and Combined Bot Data (Sorted by Price) ---
    // This data is pre-calculated and includes both original and grand opening bots,
    // sorted strictly by their 'price' field.
    const ALL_BOTS_DATA = [
  {
    "id": 1,
    "name": "Starter UBT Bot",
    "price": 100,
    "lockInDays": 2,
    "dailyCredit": 10.0,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Ideal for new investors to understand bot operations.",
    "totalReturnAmount": 120.0,
    "totalProfit": 20.0,
    "profitRatio": 0.2
  },
  {
    "id": "GO-1",
    "name": "GRAND OPENING: Starter UBT Bot",
    "price": 125,
    "lockInDays": 2,
    "dailyCredit": 15.0,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Ideal for new investors to understand bot operations.",
    "totalReturnAmount": 155.0,
    "totalProfit": 30.0,
    "profitRatio": 0.24,
    "originalBotId": 1,
    "isGrandOpeningOffer": true
  },
  {
    "id": 2,
    "name": "UBT Bot #2",
    "price": 200,
    "lockInDays": 48,
    "dailyCredit": 11.88,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Accelerated profit generation and daily insights.",
    "totalReturnAmount": 770.24,
    "totalProfit": 570.24,
    "profitRatio": 2.8512
  },
  {
    "id": "GO-2",
    "name": "GRAND OPENING: UBT Bot #2",
    "price": 250,
    "lockInDays": 48,
    "dailyCredit": 17.82,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Accelerated profit generation and daily insights.",
    "totalReturnAmount": 1105.3600000000001,
    "totalProfit": 855.36,
    "profitRatio": 3.4214,
    "originalBotId": 2,
    "isGrandOpeningOffer": true
  },
  {
    "id": 3,
    "name": "UBT Bot #3",
    "price": 600,
    "lockInDays": 93,
    "dailyCredit": 13.75,
    "hasBonus": true,
    "bonusCreditAmount": 418.25,
    "bonusCreditInterval": "monthly (15th of month)",
    "specialFeature": "Enhanced returns for dedicated investors.",
    "totalReturnAmount": 2901.0,
    "totalProfit": 2301.0,
    "profitRatio": 3.835
  },
  {
    "id": "GO-3",
    "name": "GRAND OPENING: UBT Bot #3",
    "price": 750,
    "lockInDays": 93,
    "dailyCredit": 20.62,
    "hasBonus": true,
    "bonusCreditAmount": 836.5,
    "bonusCreditInterval": "monthly (15th of month)",
    "specialFeature": "Enhanced returns for dedicated investors.",
    "totalReturnAmount": 4627.16,
    "totalProfit": 3877.16,
    "profitRatio": 5.1695,
    "originalBotId": 3,
    "isGrandOpeningOffer": true
  },
  {
    "id": 4,
    "name": "UBT Bot #4",
    "price": 1300,
    "lockInDays": 139,
    "dailyCredit": 15.62,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Accelerated profit generation and daily insights.",
    "totalReturnAmount": 3471.18,
    "totalProfit": 2171.18,
    "profitRatio": 1.6701
  },
  {
    "id": "GO-4",
    "name": "GRAND OPENING: UBT Bot #4",
    "price": 1625,
    "lockInDays": 139,
    "dailyCredit": 23.43,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Accelerated profit generation and daily insights.",
    "totalReturnAmount": 4881.77,
    "totalProfit": 3256.77,
    "profitRatio": 2.0042,
    "originalBotId": 4,
    "isGrandOpeningOffer": true
  },
  {
    "id": 5,
    "name": "UBT Bot #5",
    "price": 3200,
    "lockInDays": 184,
    "dailyCredit": 17.5,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Enhanced returns for dedicated investors.",
    "totalReturnAmount": 6420.0,
    "totalProfit": 3220.0,
    "profitRatio": 1.0063
  },
  {
    "id": "GO-5",
    "name": "GRAND OPENING: UBT Bot #5",
    "price": 4000,
    "lockInDays": 184,
    "dailyCredit": 26.25,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Enhanced returns for dedicated investors.",
    "totalReturnAmount": 8830.0,
    "totalProfit": 4830.0,
    "profitRatio": 1.2075,
    "originalBotId": 5,
    "isGrandOpeningOffer": true
  },
  {
    "id": 6,
    "name": "UBT Bot #6",
    "price": 7500,
    "lockInDays": 229,
    "dailyCredit": 19.38,
    "hasBonus": true,
    "bonusCreditAmount": 589.65,
    "bonusCreditInterval": "monthly (15th of month)",
    "specialFeature": "Accelerated profit generation and daily insights.",
    "totalReturnAmount": 16480.82,
    "totalProfit": 8980.82,
    "profitRatio": 1.1974
  },
  {
    "id": "GO-6",
    "name": "GRAND OPENING: UBT Bot #6",
    "price": 9375,
    "lockInDays": 229,
    "dailyCredit": 29.07,
    "hasBonus": true,
    "bonusCreditAmount": 1179.3,
    "bonusCreditInterval": "monthly (15th of month)",
    "specialFeature": "Accelerated profit generation and daily insights.",
    "totalReturnAmount": 24201.29,
    "totalProfit": 14826.29,
    "profitRatio": 1.5815,
    "originalBotId": 6,
    "isGrandOpeningOffer": true
  },
  {
    "id": 7,
    "name": "UBT Bot #7",
    "price": 17800,
    "lockInDays": 275,
    "dailyCredit": 21.25,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Enhanced returns for dedicated investors.",
    "totalReturnAmount": 23643.75,
    "totalProfit": 5843.75,
    "profitRatio": 0.3283
  },
  {
    "id": "GO-7",
    "name": "GRAND OPENING: UBT Bot #7",
    "price": 22250,
    "lockInDays": 275,
    "dailyCredit": 31.88,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Enhanced returns for dedicated investors.",
    "totalReturnAmount": 31017.0,
    "totalProfit": 8767.0,
    "profitRatio": 0.394,
    "originalBotId": 7,
    "isGrandOpeningOffer": true
  },
  {
    "id": 8,
    "name": "UBT Bot #8",
    "price": 42200,
    "lockInDays": 320,
    "dailyCredit": 23.12,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Accelerated profit generation and daily insights.",
    "totalReturnAmount": 49598.4,
    "totalProfit": 7398.400000000001,
    "profitRatio": 0.1753
  },
  {
    "id": "GO-8",
    "name": "GRAND OPENING: UBT Bot #8",
    "price": 52750,
    "lockInDays": 320,
    "dailyCredit": 34.68,
    "hasBonus": false,
    "bonusCreditAmount": 0.0,
    "bonusCreditInterval": null,
    "specialFeature": "Accelerated profit generation and daily insights.",
    "totalReturnAmount": 63847.6,
    "totalProfit": 11097.6,
    "profitRatio": 0.2104,
    "originalBotId": 8,
    "isGrandOpeningOffer": true
  },
  {
    "id": 9,
    "name": "UBT Bot #9",
    "price": 100000,
    "lockInDays": 365,
    "dailyCredit": 25.0,
    "hasBonus": true,
    "bonusCreditAmount": 760.42,
    "bonusCreditInterval": "monthly (15th of month)",
    "specialFeature": "Enhanced returns for dedicated investors.",
    "totalReturnAmount": 118250.0,
    "totalProfit": 18250.0,
    "profitRatio": 0.1825
  },
  {
    "id": 10,
    "name": "VIP Elite UBT Bot",
    "price": 100000,
    "lockInDays": 365,
    "dailyCredit": 25.0,
    "hasBonus": true,
    "bonusCreditAmount": 760.42,
    "bonusCreditInterval": "monthly (15th of month)",
    "specialFeature": "Dedicated VIP investment consultant for priority support and optimal returns.",
    "totalReturnAmount": 118250.0,
    "totalProfit": 18250.0,
    "profitRatio": 0.1825
  },
  {
    "id": "GO-9",
    "name": "GRAND OPENING: UBT Bot #9",
    "price": 125000,
    "lockInDays": 365,
    "dailyCredit": 37.5,
    "hasBonus": true,
    "bonusCreditAmount": 1520.84,
    "bonusCreditInterval": "monthly (15th of month)",
    "specialFeature": "Enhanced returns for dedicated investors.",
    "totalReturnAmount": 150687.5,
    "totalProfit": 25687.5,
    "profitRatio": 0.2055,
    "originalBotId": 9,
    "isGrandOpeningOffer": true
  },
  {
    "id": "GO-10",
    "name": "GRAND OPENING: VIP Elite UBT Bot",
    "price": 125000,
    "lockInDays": 365,
    "dailyCredit": 37.5,
    "hasBonus": true,
    "bonusCreditAmount": 1520.84,
    "bonusCreditInterval": "monthly (15th of month)",
    "specialFeature": "Dedicated VIP investment consultant for priority support and optimal returns.",
    "totalReturnAmount": 150687.5,
    "totalProfit": 25687.5,
    "profitRatio": 0.2055,
    "originalBotId": 10,
    "isGrandOpeningOffer": true
  }
];
    // --- END: Hardcoded and Combined Bot Data ---

    function showStatusMessage(message, type = 'info') {
        if (!statusMessage) return;
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        setTimeout(() => { statusMessage.style.display = 'none'; }, 5000);
    }

    function renderProducts(botsToRender) {
        if (!productsGrid) {
            console.error("Products grid not found.");
            return;
        }
        productsGrid.innerHTML = ''; // Clear loading message or old cards

        if (!botsToRender || botsToRender.length === 0) {
            productsGrid.innerHTML = '<p>No AI products available at the moment.</p>';
            return;
        }

        botsToRender.forEach(bot => {
            const card = document.createElement('div');
            // Determine if it's a Grand Opening offer
            const isGrandOpeningOffer = bot.isGrandOpeningOffer || false;
            let daysLeft = 0;
            if (isGrandOpeningOffer) {
                daysLeft = calculateDaysLeft();
                card.classList.add('grand-opening-card'); // Add a class for specific styling
            }
            
            card.className = 'product-card'; // Base class

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
    }

    async function handleBuyBot(event) {
        const botId = event.target.dataset.botId;
        const botPrice = event.target.dataset.botPrice;
        const token = localStorage.getItem('token');

        if (!token) {
            showStatusMessage('Please log in to purchase a bot.', 'error');
            return;
        }

        const botCard = event.target.closest('.product-card');
        const botName = botCard.querySelector('h3').textContent;

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
                body: JSON.stringify({ botId: botId, price: parseFloat(botPrice) }) // Ensure price is sent as a number
            });
            const result = await response.json();

            if (result.success) {
                showStatusMessage(result.msg || 'Bot purchased successfully!', 'success');
                if (typeof balanceManager !== 'undefined' && typeof result.newBalance === 'number') {
                     balanceManager.updateBalance(result.newBalance);
                }
                // Re-render all bots to update countdowns or states if any
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

    // Initial load of products using the hardcoded data
    renderProducts(ALL_BOTS_DATA); 
});
