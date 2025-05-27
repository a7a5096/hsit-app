/**
 * HSIT App - API-based Crypto Deposit Address Assignment
 * This script handles fetching unique crypto wallet addresses for users
 * from the backend API instead of CSV files
 */

// Immediately invoked function to avoid global namespace pollution
(function() {
    // Initialize when the DOM is fully loaded
    document.addEventListener('DOMContentLoaded', function() {
        // Find the Deposit button
        const buttons = document.querySelectorAll('a');
        let depositButton = null;
        
        // Look for the button by text content
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
        
        // Add click event listener to the deposit button
        depositButton.addEventListener('click', function(event) {
            event.preventDefault();
            handleDepositClick();
        });
        
        console.log('Crypto deposit address assignment initialized');
    });
    
    /**
     * Handle deposit button click
     */
    async function handleDepositClick() {
        try {
            // Check if user is authenticated
            const token = localStorage.getItem('token');
            
            if (!token) {
                window.location.href = '/login.html?redirect=deposit';
                return;
            }
            
            // Show loading indicator
            showLoadingIndicator();
            
            // Fetch addresses from API
            const addresses = await fetchAddressesFromAPI(token);
            
            // Hide loading indicator
            hideLoadingIndicator();
            
            if (!addresses) {
                alert('Error: Could not retrieve crypto addresses. Please contact support.');
                return;
            }
            
            // Show addresses in modal
            showAddressesModal(addresses);
        } catch (error) {
            console.error('Error handling deposit click:', error);
            hideLoadingIndicator();
            alert('An error occurred. Please try again later or contact support.');
        }
    }
    
    /**
     * Fetch addresses from backend API
     */
    async function fetchAddressesFromAPI(token) {
        try {
            const response = await fetch('/api/deposit/addresses', {
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
                throw new Error(data.message || 'Failed to get addresses');
            }
            
            return {
                bitcoin: data.addresses.bitcoin,
                ethereum: data.addresses.ethereum,
                usdt: data.addresses.ubt
            };
        } catch (error) {
            console.error('Error fetching addresses from API:', error);
            return null;
        }
    }
    
    /**
     * Show loading indicator
     */
    function showLoadingIndicator() {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        
        // Create spinner
        const spinner = document.createElement('div');
        spinner.style.border = '5px solid #f3f3f3';
        spinner.style.borderTop = '5px solid #3498db';
        spinner.style.borderRadius = '50%';
        spinner.style.width = '50px';
        spinner.style.height = '50px';
        spinner.style.animation = 'spin 2s linear infinite';
        
        // Add animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);
    }
    
    /**
     * Hide loading indicator
     */
    function hideLoadingIndicator() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    /**
     * Show modal with assigned addresses
     */
    function showAddressesModal(assignment) {
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
        heading.textContent = 'Deposit Crypto';
        heading.style.marginTop = '0';
        heading.style.color = '#333';
        content.appendChild(heading);
        
        // Add description
        const description = document.createElement('p');
        description.textContent = 'Please send your crypto to the following addresses:';
        content.appendChild(description);
        
        // Add Bitcoin address
        addAddressSection(content, 'Bitcoin', assignment.bitcoin, '#f7931a');
        
        // Add Ethereum address
        addAddressSection(content, 'Ethereum', assignment.ethereum, '#627eea');
        
        // Add USDT address
        addAddressSection(content, 'USDT', assignment.usdt, '#26a17b');
        
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
    }
    
    /**
     * Add an address section to the modal
     */
    function addAddressSection(container, title, address, color) {
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
        input.value = address;
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
            input.select();
            document.execCommand('copy');
            alert('Address copied to clipboard!');
        };
        addressContainer.appendChild(copyButton);
        
        section.appendChild(addressContainer);
        container.appendChild(section);
    }
})();
