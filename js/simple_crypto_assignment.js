/**
 * HSIT App - Simplified Crypto Deposit Address Assignment
 * This script handles assigning unique crypto wallet addresses to users
 * from bitcoin.csv, ethereum.csv, and USDT.csv files
 */

// Immediately invoked function to avoid global namespace pollution
(function() {
    // Store assigned addresses in localStorage
    const STORAGE_KEY = 'hsit_assigned_addresses';
    
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
    function handleDepositClick() {
        // Get or create user ID (using email from URL or localStorage)
        const urlParams = new URLSearchParams(window.location.search);
        let userId = urlParams.get('email');
        
        if (!userId) {
            userId = localStorage.getItem('userEmail');
            
            if (!userId) {
                // Prompt for email if not found
                userId = prompt("Please enter your email to view deposit addresses:", "");
                
                if (userId) {
                    localStorage.setItem('userEmail', userId);
                } else {
                    alert('Error: User identification required to view deposit addresses.');
                    return;
                }
            }
        }
        
        // Get assigned addresses for this user
        const assignedAddresses = getAssignedAddresses(userId);
        
        if (assignedAddresses) {
            // Show the addresses in a modal
            showAddressesModal(assignedAddresses);
        } else {
            alert('Error: Could not assign crypto addresses. Please contact support.');
        }
    }
    
    /**
     * Get assigned addresses for a user, or assign new ones if none exist
     */
    function getAssignedAddresses(userId) {
        // Check if user already has assigned addresses
        const allAssignments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        
        if (allAssignments[userId]) {
            return allAssignments[userId];
        }
        
        // If no addresses assigned yet, assign new ones
        const bitcoinAddress = getNextAddress('bitcoin');
        const ethereumAddress = getNextAddress('ethereum');
        const usdtAddress = getNextAddress('usdt');
        
        if (!bitcoinAddress || !ethereumAddress || !usdtAddress) {
            console.error('Failed to get addresses');
            return null;
        }
        
        // Create new assignment
        const newAssignment = {
            userId: userId,
            bitcoin: bitcoinAddress,
            ethereum: ethereumAddress,
            usdt: usdtAddress,
            assignedAt: new Date().toISOString()
        };
        
        // Save the assignment
        allAssignments[userId] = newAssignment;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allAssignments));
        
        console.log('Assigned addresses to user:', userId, newAssignment);
        return newAssignment;
    }
    
    /**
     * Get the next available address for a crypto type
     */
    function getNextAddress(cryptoType) {
        // In a real implementation, these would be loaded from your CSV files
        // For now, we're using hardcoded addresses for demonstration
        const addresses = {
            bitcoin: [
                '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
                'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
                'bc1qc7slrfxkknqcq2jevvvkdgvrt8080852dfjewde450xdlk4ugp7szw5tk9',
                '1HLoD9E4SDFFPDiYfNYnkBLQ85Y51J3Zb1'
            ],
            ethereum: [
                '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f44f',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f450',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f451',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f452'
            ],
            usdt: [
                '0x742d35Cc6634C0532925a3b844Bc454e4438f453',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f454',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f455',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f456',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f457'
            ]
        };
        
        // Get all assignments
        const allAssignments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        
        // Get all assigned addresses of this type
        const assignedAddresses = Object.values(allAssignments)
            .map(assignment => assignment[cryptoType]);
        
        // Find an unassigned address
        const availableAddresses = addresses[cryptoType].filter(
            address => !assignedAddresses.includes(address)
        );
        
        if (availableAddresses.length === 0) {
            console.error(`No available ${cryptoType} addresses`);
            return null;
        }
        
        return availableAddresses[0];
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
