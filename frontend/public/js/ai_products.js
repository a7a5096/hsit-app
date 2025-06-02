document.addEventListener('DOMContentLoaded', () => {
    const productsGrid = document.getElementById('productsGrid');
    const productsLoadingIndicator = document.getElementById('productsLoadingIndicator');
    const pageStatusMessage = document.getElementById('statusMessage'); // For general page messages
    
    // Modal elements (ensure these IDs match your AI Products - HSIT.html)
    const purchaseModal = document.getElementById('purchaseModal');
    const modalProductName = document.getElementById('modalProductName');
    const modalProductCost = document.getElementById('modalProductCost');
    const modalUserBalance = document.getElementById('modalUserBalance');
    const confirmPurchaseBtn = document.getElementById('confirmPurchaseBtn');
    const cancelPurchaseBtn = document.getElementById('cancelPurchaseBtn'); // Added for explicit cancel
    const purchaseError = document.getElementById('purchaseError');
    const closeModalBtn = document.getElementById('closePurchaseModalBtn'); // Ensure this ID exists on your modal's close (X) button

    let currentProductToPurchase = null;
    let currentUserUbtBalance = 0;

    // Function to display messages on the page
    function showAppMessage(message, type = 'info', duration = 7000) {
        if (pageStatusMessage) {
            pageStatusMessage.textContent = message;
            pageStatusMessage.className = `status-message ${type}`;
            pageStatusMessage.style.display = 'block';
            setTimeout(() => {
                pageStatusMessage.style.display = 'none';
            }, duration);
        } else {
            console.log(`AppMessage (${type}): ${message}`);
        }
    }
    
    // Function to display errors within the modal
    function showModalError(message) {
        if (purchaseError) {
            purchaseError.textContent = message;
            purchaseError.style.display = 'block';
        } else {
            console.error("Modal error display element not found. Message:", message);
        }
    }

    // Fetch products from the backend
    async function fetchProducts() {
        if (productsLoadingIndicator) productsLoadingIndicator.style.display = 'block';
        if (productsGrid) productsGrid.innerHTML = ''; // Clear previous products

        try {
            if (typeof API_URL === 'undefined') {
                throw new Error('API_URL is not defined. Ensure config.js is loaded before this script.');
            }
            // Assuming your API endpoint for AI products/bots is /api/bots
            const response = await fetch(`${API_URL}/api/bots`); 
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch AI products. Status: ${response.status}` }));
                throw new Error(errorData.message);
            }
            const result = await response.json();
            if (result.success && Array.isArray(result.bots)) {
                displayProducts(result.bots);
            } else {
                throw new Error(result.message || 'Invalid product data received from server.');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            showAppMessage(error.message || 'Could not load AI products. Please try again later.', 'error');
            if (productsGrid) productsGrid.innerHTML = '<p style="text-align:center; color: #ccc;">Failed to load products. Please refresh.</p>';
        } finally {
            if (productsLoadingIndicator) productsLoadingIndicator.style.display = 'none';
        }
    }

    // Display products on the page
    function displayProducts(bots) {
        if (!productsGrid) {
            console.error("Products grid element (#productsGrid) not found in HTML.");
            return;
        }
        productsGrid.innerHTML = ''; // Clear loading indicator or old products

        if (bots.length === 0) {
            productsGrid.innerHTML = '<p style="text-align:center; color: #ccc;">No AI products available at the moment.</p>';
            return;
        }

        bots.forEach(bot => {
            const productId = bot._id || bot.id; // Use _id or id based on your backend
            if (!productId) {
                console.warn("Skipping bot with no ID:", bot);
                return; // Skip rendering if no ID
            }

            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.productId = productId;

            const logoClass = bot.logoStyle || `logo-${(bot.name || 'generic').toLowerCase().split(' ')[0].replace(/[^a-z0-9]/gi, '')}`;
            
            // Handle potentially non-numeric or string earnings like "1.2% Daily"
            let dailyEarningsText = 'N/A';
            if (typeof bot.dailyEarnings === 'number') {
                dailyEarningsText = `${bot.dailyEarnings.toFixed(2)} UBT`;
            } else if (typeof bot.dailyEarnings === 'string') {
                dailyEarningsText = bot.dailyEarnings; // e.g., "1.2% Daily"
            }

            const investmentAmount = typeof bot.investmentAmount === 'number' ? bot.investmentAmount.toFixed(2) : (bot.investmentAmount || 'N/A');
            const cycle = bot.cycleDays || bot.cycle || 'N/A';
            const shortTagline = bot.tagline || (bot.purchaseLimit ? `Limited to ${bot.purchaseLimit} per user.` : 'Available!');

            card.innerHTML = `
                <div class="product-logo ${logoClass}">
                    <span>${bot.name || 'Unnamed Bot'}</span>
                </div>
                <div class="product-info-stats">
                    <div><span>${dailyEarningsText}</span><label>Daily</label></div>
                    <div><span>${cycle} day(s)</span><label>Cycle</label></div>
                    <div><span>${investmentAmount} UBT</span><label>Cost</label></div>
                </div>
                <div class="product-purchases">${shortTagline}</div>
                <div class="product-details">
                    <h3>Product Details</h3>
                    <p>${bot.description || 'No description available.'}</p>
                    ${bot.features && Array.isArray(bot.features) && bot.features.length > 0 ? 
                        `<ul class="bot-features">
                            ${bot.features.map(feature => `<li><strong>${feature.name || 'Feature'}:</strong> ${feature.detail || ''}</li>`).join('')}
                        </ul>` : '<p>No specific features listed.</p>'
                    }
                </div>
                <div class="product-actions">
                    <button type="button" class="btn btn-primary btn-buy full-width" data-product-id="${productId}">Invest Now</button>
                </div>
            `;
            productsGrid.appendChild(card);

            const buyButton = card.querySelector('.btn-buy');
            if (buyButton) {
                buyButton.addEventListener('click', () => {
                    currentProductToPurchase = bot;
                    openPurchaseModal(bot);
                });
            }
        });
    }

    // Fetch user's UBT balance
    async function fetchUserUbtBalance() {
        const token = localStorage.getItem('token');
        if (!token) { 
            console.warn("No token found for fetching user balance.");
            return 0; 
        }

        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/auth`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) {
                 console.error(`Failed to fetch user balance. Status: ${response.status}`);
                 return 0;
            }
            const data = await response.json();
            return (data.success && data.balances && typeof data.balances.ubt === 'number') ? data.balances.ubt : 0;
        } catch (error) {
            console.error('Error fetching user UBT balance:', error);
            return 0;
        }
    }

    // Open purchase confirmation modal
    async function openPurchaseModal(product) {
        if (!purchaseModal || !product) {
            console.error("Purchase modal or product data missing.");
            return;
        }

        const investmentAmount = typeof product.investmentAmount === 'number' ? product.investmentAmount.toFixed(2) : 'N/A';

        if (modalProductName) modalProductName.textContent = product.name || 'N/A';
        if (modalProductCost) modalProductCost.textContent = investmentAmount;
        
        if(modalUserBalance) modalUserBalance.textContent = 'Loading...';
        currentUserUbtBalance = await fetchUserUbtBalance();
        if(modalUserBalance) modalUserBalance.textContent = currentUserUbtBalance.toFixed(2);

        if (purchaseError) purchaseError.style.display = 'none'; 
        purchaseModal.style.display = 'flex';
    }

    // Handle purchase confirmation
    async function confirmPurchase() {
        const token = localStorage.getItem('token');
        if (!token || !currentProductToPurchase) {
            showModalError('Error: Product information or authentication is missing. Please try again.');
            return;
        }

        const productId = currentProductToPurchase._id || currentProductToPurchase.id;
        const investmentAmount = parseFloat(currentProductToPurchase.investmentAmount);

        if (!productId) {
            showModalError('Error: Product ID is missing.');
            return;
        }
        if (isNaN(investmentAmount)) {
            showModalError('Error: Product investment amount is invalid.');
            return;
        }
        
        if (currentUserUbtBalance < investmentAmount) {
            showModalError('Insufficient UBT balance for this purchase.');
            return;
        }

        if (confirmPurchaseBtn) {
            confirmPurchaseBtn.disabled = true;
            confirmPurchaseBtn.textContent = 'Processing...';
        }
        if (purchaseError) purchaseError.style.display = 'none';

        try {
            if (typeof API_URL === 'undefined') throw new Error('API_URL is not defined.');
            const response = await fetch(`${API_URL}/api/bots/${productId}/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                },
                // The backend /api/bots/:botId/purchase should know the cost of the bot.
                // Sending amount in body is optional unless your backend explicitly requires it.
                // body: JSON.stringify({ amount: investmentAmount }) 
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showAppMessage(data.message || 'Purchase successful! Your new bot is active.', 'success');
                if (purchaseModal) purchaseModal.style.display = 'none';
                fetchProducts(); // Refresh products list (e.g., if purchase limits change or to show owned status)
            } else {
                showModalError(data.message || 'Purchase failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during purchase confirmation:', error);
            showModalError('An unexpected error occurred during purchase. Please try again.');
        } finally {
            if (confirmPurchaseBtn) {
                confirmPurchaseBtn.disabled = false;
                confirmPurchaseBtn.textContent = 'Confirm Purchase';
            }
        }
    }

    // Event listeners for modal close/cancel
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (purchaseModal) purchaseModal.style.display = 'none';
        });
    }
    if (cancelPurchaseBtn) { // Assuming you have a cancel button with id="cancelPurchaseBtn" in your modal
        cancelPurchaseBtn.addEventListener('click', () => {
            if (purchaseModal) purchaseModal.style.display = 'none';
        });
    }
    if (confirmPurchaseBtn) {
        confirmPurchaseBtn.addEventListener('click', confirmPurchase);
    }
    
    // Close modal if user clicks outside of the modal content
    if (purchaseModal) {
        window.addEventListener('click', (event) => {
            if (event.target === purchaseModal) {
                purchaseModal.style.display = 'none';
            }
        });
    }

    // Initial load of products
    fetchProducts();
});
