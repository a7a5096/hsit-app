/**
 * HSIT App - Crypto Deposit Address Fetcher
 * This script handles fetching unique crypto wallet addresses from the backend API
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
                // Show loading indicator
                const loadingModal = showLoadingModal();
                
                // Fetch addresses from backend API
                fetchAddressesFromAPI()
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
                
                const keyframes = document.createElement('style');
                keyframes.innerHTML = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                
                document.head.appendChild(keyframes);
                modal.appendChild(spinner);
                document.body.appendChild(modal);
                
                return modal;
            } catch (error) {
                console.error('Error showing loading modal:', error);
                // Return a dummy element that can be safely removed
                return document.createElement('div');
            }
        }
        
        /**
         * Show error modal
         */
        function showErrorModal(message) {
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
                
                const content = document.createElement('div');
                content.style.backgroundColor = '#fff';
                content.style.padding = '20px';
                content.style.borderRadius = '5px';
                content.style.maxWidth = '500px';
                content.style.width = '90%';
                content.style.textAlign = 'center';
                
                const heading = document.createElement('h3');
                heading.textContent = 'Error';
                heading.style.color = '#e74c3c';
                heading.style.marginTop = '0';
                content.appendChild(heading);
                
                const text = document.createElement('p');
                text.textContent = message;
                content.appendChild(text);
                
                const button = document.createElement('button');
                button.textContent = 'Close';
                button.style.padding = '10px 20px';
                button.style.backgroundColor = '#3498db';
                button.style.color = 'white';
                button.style.border = 'none';
                button.style.borderRadius = '4px';
                button.style.cursor = 'pointer';
                button.style.marginTop = '15px';
                button.onclick = function() {
                    document.body.removeChild(modal);
                };
                content.appendChild(button);
                
                modal.appendChild(content);
                document.body.appendChild(modal);
            } catch (error) {
                console.error('Error showing error modal:', error);
                alert(message);
            }
        }
        
        /**
         * Fetch addresses from backend API
         */
        async function fetchAddressesFromAPI() {
            try {
                // Get auth token from localStorage
                const token = localStorage.getItem('token');
                
                if (!token) {
                    console.error('No authentication token found');
                    showErrorModal('Please log in to view your deposit addresses.');
                    return null;
                }
                
                // Add cache-busting parameter to prevent caching
                const cacheBuster = Date.now();
                
                // Make API request to get addresses
                const response = await fetch(`${API_URL}/api/crypto/addresses?_=${cacheBuster}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-auth-token': token,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message || 'Failed to fetch addresses');
                }
                
                return {
                    bitcoin: data.addresses.bitcoin,
                    ethereum: data.addresses.ethereum,
                    usdt: data.addresses.usdt
                };
            } catch (error) {
                console.error('Error fetching addresses from API:', error);
                
                // Try to get addresses from direct API call as fallback
                try {
                    return await fetchAddressesFallback();
                } catch (fallbackError) {
                    console.error('Fallback address fetch also failed:', fallbackError);
                    return null;
                }
            }
        }
        
        /**
         * Fallback method to fetch addresses using XMLHttpRequest
         */
        function fetchAddressesFallback() {
            return new Promise((resolve, reject) => {
                try {
                    const token = localStorage.getItem('token');
                    
                    if (!token) {
                        reject(new Error('No authentication token found'));
                        return;
                    }
                    
                    const xhr = new XMLHttpRequest();
                    const cacheBuster = Date.now();
                    xhr.open('GET', `${API_URL}/api/crypto/addresses?_=${cacheBuster}`, true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.setRequestHeader('x-auth-token', token);
                    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                    xhr.setRequestHeader('Pragma', 'no-cache');
                    xhr.setRequestHeader('Expires', '0');
                    
                    xhr.onload = function() {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                
                                if (!data.success) {
                                    reject(new Error(data.message || 'Failed to fetch addresses'));
                                    return;
                                }
                                
                                resolve({
                                    bitcoin: data.addresses.bitcoin,
                                    ethereum: data.addresses.ethereum,
                                    usdt: data.addresses.usdt
                                });
                            } catch (error) {
                                reject(error);
                            }
                        } else {
                            reject(new Error(`API error: ${xhr.status}`));
                        }
                    };
                    
                    xhr.onerror = function() {
                        reject(new Error('Network error'));
                    };
                    
                    xhr.send();
                } catch (error) {
                    reject(error);
                }
            });
        }
        
        /**
         * Show fallback address modal when other methods fail
         */
        function showFallbackAddressModal() {
            try {
                // Get token from localStorage
                const token = localStorage.getItem('token');
                
                if (!token) {
                    showErrorModal('Please log in to view your deposit addresses.');
                    return;
                }
                
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
                modal.style.zIndex = '9999';
                
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
                description.textContent = 'Please visit the API directly to view your addresses:';
                content.appendChild(description);
                
                // Add link to API
                const link = document.createElement('a');
                link.href = `${API_URL}/api/crypto/addresses`;
                link.textContent = 'View My Deposit Addresses';
                link.target = '_blank';
                link.style.display = 'block';
                link.style.marginBottom = '20px';
                link.style.color = '#3498db';
                content.appendChild(link);
                
                // Add close button
                const closeButton = document.createElement('button');
                closeButton.textContent = 'Close';
                closeButton.style.padding = '10px 20px';
                closeButton.style.backgroundColor = '#3498db';
                closeButton.style.color = 'white';
                closeButton.style.border = 'none';
                closeButton.style.borderRadius = '4px';
                closeButton.style.cursor = 'pointer';
                closeButton.onclick = function() {
                    document.body.removeChild(modal);
                };
                content.appendChild(closeButton);
                
                // Add content to modal
                modal.appendChild(content);
                
                // Add modal to body
                document.body.appendChild(modal);
            } catch (error) {
                console.error('Error showing fallback modal:', error);
                alert('Please visit the API directly to view your deposit addresses.');
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
                modal.style.zIndex = '9999';
                
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
         * Add an address section to the modal
         */
        function addAddressSection(container, title, address, color) {
            try {
                const section = document.createElement('div');
                section.style.marginBottom = '15px';
                
                const heading = document.createElement('h3');
                heading.textContent = title;
                heading.style.marginBottom = '5px';
                heading.style.color = color;
                section.appendChild(heading);
                
                const addressContainer = document.createElement('div');
                addressContainer.style.display = 'flex';
                addressContainer.style.alignItems = 'center';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.value = address || 'No address available';
                input.readOnly = true;
                input.style.flex = '1';
                input.style.padding = '8px';
                input.style.border = '1px solid #ddd';
                input.style.borderRadius = '4px';
                addressContainer.appendChild(input);
                
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
                        
                        // Visual feedback
                        const originalColor = copyButton.style.backgroundColor;
                        copyButton.textContent = 'Copied!';
                        copyButton.style.backgroundColor = '#2E7D32';
                        
                        setTimeout(function() {
                            copyButton.textContent = 'Copy';
                            copyButton.style.backgroundColor = originalColor;
                        }, 1500);
                    } catch (error) {
                        console.error('Error copying to clipboard:', error);
                    }
                };
                
                // Disable copy button if no address
                if (!address) {
                    copyButton.disabled = true;
                    copyButton.style.backgroundColor = '#cccccc';
                    copyButton.style.cursor = 'not-allowed';
                }
                
                addressContainer.appendChild(copyButton);
                
                section.appendChild(addressContainer);
                container.appendChild(section);
            } catch (error) {
                console.error('Error adding address section:', error);
                // Continue despite errors
            }
        }
    } catch (error) {
        console.error('Fatal error in crypto address script:', error);
        // Last resort error handler
        window.addEventListener('load', function() {
            setTimeout(function() {
                try {
                    const buttons = document.querySelectorAll('a');
                    for (let i = 0; i < buttons.length; i++) {
                        if (buttons[i].textContent && buttons[i].textContent.includes('Deposit')) {
                            buttons[i].addEventListener('click', function(event) {
                                event.preventDefault();
                                alert('Please contact support to get your deposit addresses.');
                            });
                            break;
                        }
                    }
                } catch (e) {
                    // Silent fail
                }
            }, 1000);
        });
    }
})();
