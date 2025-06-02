document.addEventListener('DOMContentLoaded', () => {
    const productsGrid = document.getElementById('productsGrid');
    const productsLoadingIndicator = document.getElementById('productsLoadingIndicator');
    const statusMessage = document.getElementById('statusMessage'); // For general messages
    
    // Modal elements
    const purchaseModal = document.getElementById('purchaseModal');
    const modalProductName = document.getElementById('modalProductName');
    const modalProductCost = document.getElementById('modalProductCost');
    const modalUserBalance = document.getElementById('modalUserBalance');
    const confirmPurchaseBtn = document.getElementById('confirmPurchaseBtn');
    const purchaseError = document.getElementById('purchaseError');
    const closeModalBtn = purchaseModal ? purchaseModal.querySelector('.close-modal-btn') : null;

    let currentProductToPurchase = null;
    let currentUserUbtBalance = 0;

    // Function to display messages
    function showAppMessage(message, type = 'info', duration = 5000) {
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`; // Applies 'error' or 'success' class
            statusMessage.style.display = 'block';
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, duration);
        } else {
            console.log(`AppMessage (${type}): ${message}`);
        }
    }
    
    function showModalError(message) {
        if (purchaseError) {
            purchaseError.textContent = message;
            purchaseError.style.display = 'block';
        }
    }

    // Fetch products from the backend
    async function fetchProducts() {
        if (!productsLoadingIndicator) {
            console.error("Loading indicator not found");
        } else {
            productsLoadingIndicator.style.display = 'block';
        }
        productsGrid.innerHTML = ''; // Clear previous products

        try {
            if (typeof API_URL === 'undefined') {
                throw new Error('API_URL is not defined. Ensure config.js is loaded.');
            }
            const response = await fetch(`${API_URL}/api/bots`); // Assuming this is your endpoint for AI products
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `Failed to fetch AI products. Status: ${response.status}`);
            }
            const products = await response.json();
            if (products.success && Array.isArray(products.bots)) {
                displayProducts(products.bots);
            } else {
                throw new Error('Invalid product data received.');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            showAppMessage(error.message || 'Could not load AI products. Please try again later.', 'error');
            if (productsGrid) productsGrid.innerHTML = '<p style="text-align:center; color: var(--light-text-emphasis);">Failed to load products.</p>';
        } finally {
            if (productsLoadingIndicator) productsLoadingIndicator.style.display = 'none';
        }
    }

    // Display products on the page
    function displayProducts(products) {
        if (!productsGrid) {
            console.error("Products grid not found");
            return;
        }
        productsGrid.innerHTML = ''; // Clear loading or old products

        if (products.length === 0) {
            productsGrid.innerHTML = '<p style="text-align:center; color: var(--light-text-emphasis);">No AI products available at the moment.</p>';
            return;
        }

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            // Use product._id or product.id depending on your backend response structure
            const productId = product._id || product.id; 
            card.dataset.productId = productId;

            // Determine logo class, default to 'logo-generic' or use product.logoStyle if available
            const logoClass = product.logoStyle || `logo-${product.name.toLowerCase().split(' ')[0] || 'generic'}`;

            // Ensure earnings and investment are numbers and format them
            const dailyEarnings = typeof product.dailyEarnings === 'number' ? product.dailyEarnings.toFixed(2) : (product.dailyEarnings || 'N/A');
            const investmentAmount = typeof product.investmentAmount === 'number' ? product.investmentAmount.toFixed(2) : (product.investmentAmount || 'N/A');
            const cycle = product.cycleDays || product.cycle || 'N/A';
            const purchaseLimitInfo = product.purchaseLimit ? `Limited to ${product.purchaseLimit} per user.` : 'Available now!';


            card.innerHTML = `
                <div class="product-logo ${logoClass}">
                    <span>${product.name || 'Unnamed Bot'}</span>
                </div>
                <div class="product-info-stats">
                    <div><span>${dailyEarnings} UBT</span><label>Daily Earnings</label></div>
                    <div><span>${cycle} day(s)</span><label>Cycle</label></div>
                    <div><span>${investmentAmount} UBT</span><label>Investment</label></div>
                </div>
                <div class="product-purchases">
                    ${purchaseLimitInfo}
                </div>
                <div class="product-details">
                    <h3>Product Details</h3>
                    <p>${product.description || 'No description available.'}</p>
                    ${product.features && Array.isArray(product.features) && product.features.length > 0 ? 
                        `<ul class="bot-features">
                            ${product.features.map(feature => `<li><strong>${feature.name || ''}:</strong> ${feature.detail || ''}</li>`).join('')}
                        </ul>` : ''
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
                    currentProductToPurchase = product; // Store the whole product object
                    openPurchaseModal(product);
                });
            }
        });
    }

    // Fetch user's UBT balance
    async function fetchUserUbtBalance() {
        const token = localStorage.getItem('token');
        if (!token) return 0; // Default to 0 if not logged in

        try {
            const response = await fetch(`${API_URL}/api/auth`, { // Your endpoint that returns user data including balances
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) return 0;
            const data = await response.json();
            return (data.success && data.balances && typeof data.balances.ubt === 'number') ? data.balances.ubt : 0;
        } catch (error) {
            console.error('Error fetching user balance:', error);
            return 0;
        }
    }

    // Open purchase confirmation modal
    async function openPurchaseModal(product) {
        if (!purchaseModal || !product) return;

        if (modalProductName) modalProductName.textContent = product.name || 'N/A';
        if (modalProductCost) modalProductCost.textContent = (typeof product.investmentAmount === 'number' ? product.investmentAmount.toFixed(2) : 'N/A');
        
        // Fetch current balance
        if(modalUserBalance) modalUserBalance.textContent = 'Loading...';
        currentUserUbtBalance = await fetchUserUbtBalance();
        if(modalUserBalance) modalUserBalance.textContent = currentUserUbtBalance.toFixed(2);

        if (purchaseError) purchaseError.style.display = 'none'; // Hide previous errors
        purchaseModal.style.display = 'flex';
    }

    // Handle purchase confirmation
    async function confirmPurchase() {
        const token = localStorage.getItem('token');
        if (!token || !currentProductToPurchase) {
            showModalError('Error: Product or authentication token missing.');
            return;
        }

        const productId = currentProductToPurchase._id || currentProductToPurchase.id;
        if (!productId) {
            showModalError('Error: Product ID missing.');
            return;
        }
        
        if (currentUserUbtBalance < currentProductToPurchase.investmentAmount) {
            showModalError('Insufficient UBT balance for this purchase.');
            return;
        }

        confirmPurchaseBtn.disabled = true;
        confirmPurchaseBtn.textContent = 'Processing...';
        if (purchaseError) purchaseError.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/api/bots/${productId}/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token,
                },
                // body: JSON.stringify({ amount: currentProductToPurchase.investmentAmount }) // Backend might not need amount if it uses bot's price
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showAppMessage(data.message || 'Purchase successful!', 'success');
                if (purchaseModal) purchaseModal.style.display = 'none';
                fetchProducts(); // Refresh products list (e.g., if purchase limits change)
                // Optionally, update a global balance display if you have one
            } else {
                showModalError(data.message || 'Purchase failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during purchase:', error);
            showModalError('An error occurred during purchase. Please try again.');
        } finally {
            confirmPurchaseBtn.disabled = false;
            confirmPurchaseBtn.textContent = 'Confirm';
        }
    }

    // Event listeners for modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (purchaseModal) purchaseModal.style.display = 'none';
        });
    }
    if (confirmPurchaseBtn) {
        confirmPurchaseBtn.addEventListener('click', confirmPurchase);
    }
    // Close modal if clicked outside of it
    if (purchaseModal) {
        window.addEventListener('click', (event) => {
            if (event.target === purchaseModal) {
                purchaseModal.style.display = 'none';
            }
        });
    }


    // Initial load
    fetchProducts();
});
