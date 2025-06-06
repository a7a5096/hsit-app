/**
 * HSIT App - API-Based Crypto Deposit Address Fetcher
 * This script handles fetching unique crypto wallet addresses from the backend API
 */

// Self-executing function to avoid global namespace pollution
(function() {
    // API endpoint for fetching addresses
    const API_URL = window.location.origin;
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing API-based crypto address fetcher...');
        setupDepositButton();
    });
    
    /**
     * Set up the deposit button
     */
    function setupDepositButton() {
        // Find the deposit button by text content
        const buttons = document.querySelectorAll('a');
        let depositButton = null;
        
        for (let i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent.includes('Deposit')) {
                depositButton = buttons[i];
                break;
            }
        }
        
        if (!depositButton) {
            console.error('Deposit button not found');
            return;
        }
        
        // Add click event listener
        depositButton.addEventListener('click', function(event) {
            event.preventDefault();
            handleDepositClick();
        });
        
        console.log('Deposit button initialized');
    }
    
    /**
     * Handle deposit button click
     */
    function handleDepositClick() {
        // Fetch addresses from backend API
        fetchAddressesFromAPI()
            .then(addresses => {
                if (addresses) {
                    // Show addresses in modal
                    showAddressesModal(addresses);
                } else {
                    alert('Error: Could not fetch crypto addresses. Please try again or contact support.');
                }
            })
            .catch(error => {
                console.error('Error fetching addresses:', error);
                alert('Error: Could not fetch crypto addresses. Please try again or contact support.');
            });
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
                alert('Please log in to view your deposit addresses.');
                return null;
            }
            
            // Make API request to get addresses
            const response = await fetch(`${API_URL}/api/crypto/addresses`, {
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
                throw new Error(data.message || 'Failed to fetch addresses');
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
    }
    
    /**
     * Add an address section to the modal
     */
    function addAddressSection(container, title, address, color) {
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
        input.value = address || 'No address available';
        input.readOnly = true;
        input.style.flex = '1';
        input.style.padding = '8px';
        input.style.border = '1px solid #ddd';
        input.style.borderRadius = '4px';
        input.style.fontSize = '14px';
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
            input.select();
            document.execCommand('copy');
            alert('Address copied to clipboard!');
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
    }
})();
