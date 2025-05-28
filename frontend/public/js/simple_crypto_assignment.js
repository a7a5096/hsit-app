/**
 * HSIT App - API-based Crypto Deposit Address Assignment
 * This script handles fetching unique crypto wallet addresses for users
 * from the backend API instead of CSV files
 * with enhanced error resilience against external script errors
 */

// Use an immediately invoked function expression (IIFE) with error handling
(function() {
    try {
        // API endpoint for fetching addresses
        const API_URL = window.location.origin;
        
        // Initialize when the DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAddressFetcher);
        } else {
            // DOM already loaded, initialize immediately
            setTimeout(initializeAddressFetcher, 100);
        }
        
        /**
         * Initialize the address fetcher
         */
        function initializeAddressFetcher() {
            try {
                console.log('Initializing crypto address fetcher with error resilience');
                
                // Clear any cached crypto addresses from localStorage
                clearCachedAddresses();
                
                // Find the Deposit button
                setupDepositButton();
            } catch (error) {
                console.error('Error initializing address fetcher:', error);
                // Continue execution despite errors
            }
        }
        
        /**
         * Set up the deposit button click handler
         */
        function setupDepositButton() {
            try {
                const buttons = document.querySelectorAll('a');
                let depositButton = null;
                
                // Look for the button by text content
                for (let i = 0; i < buttons.length; i++) {
                    try {
                        if (buttons[i].textContent && buttons[i].textContent.includes('Deposit')) {
                            depositButton = buttons[i];
                            break;
                        }
                    } catch (err) {
                        // Skip this button if there's an error
                        continue;
                    }
                }
                
                if (!depositButton) {
                    console.warn('Deposit button not found, trying alternative selectors');
                    // Try alternative selectors
                    depositButton = document.querySelector('.deposit-btn') || 
                                   document.querySelector('[data-action="deposit"]') ||
                                   document.querySelector('a[href*="deposit"]');
                }
                
                if (depositButton) {
                    // Add click event listener to the deposit button
                    depositButton.addEventListener('click', function(event) {
                        try {
                            event.preventDefault();
                            handleDepositClick();
                        } catch (error) {
                            console.error('Error in deposit button click handler:', error);
                            // Show a fallback modal if the handler fails
                            showFallbackAddressModal();
                        }
                    });
                    
                    console.log('Deposit button initialized successfully');
                } else {
                    console.error('Deposit button not found after multiple attempts');
                }
            } catch (error) {
                console.error('Error setting up deposit button:', error);
            }
        }
        
        /**
         * Clear any cached crypto addresses from localStorage
         */
        function clearCachedAddresses() {
            try {
                // Remove any cached address data
                if (localStorage.getItem('hsit_crypto_assign')) {
                    localStorage.removeItem('hsit_crypto_assign');
                    console.log('Cleared cached crypto addresses');
                }
            } catch (error) {
                console.error('Error clearing cached addresses:', error);
                // Continue execution despite errors
            }
        }
        
        /**
         * Handle deposit button click
         */
        function handleDepositClick() {
            try {
                // Check if user is authenticated
                const token = localStorage.getItem('token');
                
                if (!token) {
                    window.location.href = '/login.html?redirect=deposit';
                    return;
                }
                
                // Show loading indicator
                const loadingModal = showLoadingModal();
                
                // Fetch addresses from backend API
                fetchAddressesFromAPI(token)
                    .then(addresses => {
                        try {
                            // Remove loading indicator
                            if (document.body.contains(loadingModal)) {
                                document.body.removeChild(loadingModal);
                            }
                            
                            if (addresses) {
                                // Show the addresses in a modal
                                showAddressesModal(addresses);
                            } else {
                                showErrorModal('Could not fetch crypto addresses. Please try again or contact support.');
                            }
                        } catch (error) {
                            console.error('Error handling address display:', error);
                            showErrorModal('Error displaying addresses. Please try again or contact support.');
                        }
                    })
                    .catch(error => {
                        try {
                            // Remove loading indicator
                            if (document.body.contains(loadingModal)) {
                                document.body.removeChild(loadingModal);
                            }
                            
                            console.error('Error fetching addresses:', error);
                            showErrorModal('Error fetching addresses. Please try again or contact support.');
                        } catch (err) {
                            console.error('Error in fetch error handler:', err);
                        }
                    });
            } catch (error) {
                console.error('Error in handleDepositClick:', error);
                showErrorModal('An unexpected error occurred. Please try again or contact support.');
            }
        }
        
        /**
         * Show loading modal
         */
        function showLoadingModal() {
            try {
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
                modal.style.display = 'flex';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.zIndex = '9999';
                
                const spinner = document.createElement('div');
                spinner.style.border = '5px solid #f3f3f3';
                spinner.style.borderTop = '5px solid #3498db';
                spinner.style.borderRadius = '50%';
                spinner.style.width = '50px';
                spinner.style.height = '50px';
                spinner.style.animation = 'spin 2s linear infinite';
                
                // Add animation style if not already present
                if (!document.getElementById('spinner-style')) {
                    const style = document.createElement('style');
                    style.id = 'spinner-style';
                    style.textContent = `
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                modal.appendChild(spinner);
                document.body.appendChild(modal);
                
                return modal;
            } catch (error) {
                console.error('Error showing loading modal:', error);
                return null;
            }
        }
        
        /**
         * Fetch addresses from backend API
         */
        async function fetchAddressesFromAPI(token) {
            try {
                const response = await fetch(`${API_URL}/api/deposit/addresses`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Failed to retrieve addresses');
                }
                
                return {
                    bitcoin: data.addresses.bitcoin,
                    ethereum: data.addresses.ethereum,
                    usdt: data.addresses.usdt
                };
            } catch (error) {
                console.error('Error fetching addresses from API:', error);
                return null;
            }
        }
        
        /**
         * Show modal with assigned addresses
         */
        function showAddressesModal(addresses) {
            try {
                // Create modal container
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
                modal.style.display = 'flex';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.zIndex = '1001';
                
                // Create modal content
                const content = document.createElement('div');
                content.style.backgroundColor = '#fff';
                content.style.padding = '20px';
                content.style.borderRadius = '5px';
                content.style.maxWidth = '500px';
                content.style.width = '90%';
                
                // Add heading
                const heading = document.createElement('h2');
                heading.textContent = 'Your Crypto Deposit Addresses';
                heading.style.marginTop = '0';
                heading.style.color = '#333';
                content.appendChild(heading);
                
                // Add description
                const description = document.createElement('p');
                description.textContent = 'These addresses are uniquely assigned to your account. Send your crypto to these addresses:';
                content.appendChild(description);
                
                // Add Bitcoin address
                addAddressSection(content, 'Bitcoin', addresses.bitcoin, '#f7931a');
                
                // Add Ethereum address
                addAddressSection(content, 'Ethereum', addresses.ethereum, '#627eea');
                
                // Add USDT address
                addAddressSection(content, 'USDT', addresses.usdt, '#26a17b');
                
                // Add close button
                const buttonContainer = document.createElement('div');
                buttonContainer.style.textAlign = 'center';
                buttonContainer.style.marginTop = '20px';
                
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.style.padding = '10px 20px';
                closeButton.style.backgroundColor = '#2196F3';
                closeButton.style.color = 'white';
                closeButton.style.border = 'none';
                closeButton.style.borderRadius = '4px';
                closeButton.style.cursor = 'pointer';
                closeButton.onclick = function() {
                    document.body.removeChild(modal);
                };
                
                buttonContainer.appendChild(closeButton);
                content.appendChild(buttonContainer);
                
                // Add content to modal
                modal.appendChild(content);
                
                // Add modal to body
                document.body.appendChild(modal);
            } catch (error) {
                console.error('Error showing addresses modal:', error);
                showErrorModal('Error displaying addresses. Please try again or contact support.');
            }
        }
        
        /**
         * Show error modal
         */
        function showErrorModal(message) {
            try {
                // Create modal container
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
                modal.style.display = 'flex';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.zIndex = '1001';
                
                // Create modal content
                const content = document.createElement('div');
                content.style.backgroundColor = '#fff';
                content.style.padding = '20px';
                content.style.borderRadius = '5px';
                content.style.maxWidth = '500px';
                content.style.width = '90%';
                
                // Add heading
                const heading = document.createElement('h2');
                heading.textContent = 'Error';
                heading.style.marginTop = '0';
                heading.style.color = '#d32f2f';
                content.appendChild(heading);
                
                // Add message
                const messageElement = document.createElement('p');
                messageElement.textContent = message;
                content.appendChild(messageElement);
                
                // Add close button
                const buttonContainer = document.createElement('div');
                buttonContainer.style.textAlign = 'center';
                buttonContainer.style.marginTop = '20px';
                
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.style.padding = '10px 20px';
                closeButton.style.backgroundColor = '#d32f2f';
                closeButton.style.color = 'white';
                closeButton.style.border = 'none';
                closeButton.style.borderRadius = '4px';
                closeButton.style.cursor = 'pointer';
                closeButton.onclick = function() {
                    document.body.removeChild(modal);
                };
                
                buttonContainer.appendChild(closeButton);
                content.appendChild(buttonContainer);
                
                // Add content to modal
                modal.appendChild(content);
                
                // Add modal to body
                document.body.appendChild(modal);
            } catch (error) {
                console.error('Error showing error modal:', error);
                alert(message);
            }
        }
        
        /**
         * Show fallback address modal when main handler fails
         */
        function showFallbackAddressModal() {
            try {
                alert('Please log in to view your deposit addresses. You will be redirected to the login page.');
                window.location.href = '/login.html?redirect=deposit';
            } catch (error) {
                console.error('Error showing fallback modal:', error);
            }
        }
        
        /**
         * Add an address section to the modal
         */
        function addAddressSection(container, title, address, color) {
            try {
                const section = document.createElement('div');
                section.style.marginBottom = '15px';
                section.style.padding = '10px';
                section.style.border = '1px solid #eee';
                section.style.borderRadius = '4px';
                
                const heading = document.createElement('h3');
                heading.textContent = title;
                heading.style.marginTop = '0';
                heading.style.marginBottom = '10px';
                heading.style.color = color;
                section.appendChild(heading);
                
                const addressContainer = document.createElement('div');
                addressContainer.style.display = 'flex';
                addressContainer.style.alignItems = 'center';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.value = address || 'Not available';
                input.readOnly = true;
                input.style.flex = '1';
                input.style.padding = '8px';
                input.style.border = '1px solid #ddd';
                input.style.borderRadius = '4px';
                input.style.fontSize = '14px';
                addressContainer.appendChild(input);
                
                if (address) {
                    const copyButton = document.createElement('button');
                    copyButton.textContent = 'Copy';
                    copyButton.style.marginLeft = '10px';
                    copyButton.style.padding = '8px 12px';
                    copyButton.style.backgroundColor = '#4CAF50';
                    copyButton.style.color = 'white';
                    copyButton.style.border = 'none';
                    copyButton.style.borderRadius = '4px';
                    copyButton.style.cursor = 'pointer';
                    copyButton.onclick = function() {
                        try {
                            input.select();
                            document.execCommand('copy');
                            copyButton.textContent = 'Copied!';
                            setTimeout(() => {
                                copyButton.textContent = 'Copy';
                            }, 2000);
                        } catch (error) {
                            console.error('Error copying to clipboard:', error);
                            copyButton.textContent = 'Failed';
                            setTimeout(() => {
                                copyButton.textContent = 'Copy';
                            }, 2000);
                        }
                    };
                    addressContainer.appendChild(copyButton);
                }
                
                section.appendChild(addressContainer);
                container.appendChild(section);
            } catch (error) {
                console.error('Error adding address section:', error);
            }
        }
    } catch (error) {
        console.error('Fatal error in crypto address assignment script:', error);
    }
})();
