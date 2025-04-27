/**
 * HSIT App - Direct CSV Crypto Address Assignment
 * This script directly reads the 3 CSV files and assigns unique addresses to users
 */

// Self-executing function to avoid global namespace pollution
(function() {
    // Configuration
    const CONFIG = {
        csvPaths: {
            bitcoin: '/csv/bitcoin.csv',  // Update path to match your server structure
            ethereum: '/csv/ethereum.csv', // Update path to match your server structure
            usdt: '/csv/USDT.csv'         // Update path to match your server structure
        },
        storageKey: 'hsit_crypto_assignments'
    };
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing direct crypto address assignment...');
        initCryptoAssignment();
    });
    
    /**
     * Initialize the crypto address assignment system
     */
    async function initCryptoAssignment() {
        try {
            // Load all CSV files
            const bitcoinAddresses = await loadCsvFile(CONFIG.csvPaths.bitcoin);
            const ethereumAddresses = await loadCsvFile(CONFIG.csvPaths.ethereum);
            const usdtAddresses = await loadCsvFile(CONFIG.csvPaths.usdt);
            
            console.log(`Loaded ${bitcoinAddresses.length} Bitcoin addresses`);
            console.log(`Loaded ${ethereumAddresses.length} Ethereum addresses`);
            console.log(`Loaded ${usdtAddresses.length} USDT addresses`);
            
            // Store addresses in memory
            window.cryptoAddresses = {
                bitcoin: bitcoinAddresses,
                ethereum: ethereumAddresses,
                usdt: usdtAddresses
            };
            
            // Find and set up the deposit button
            setupDepositButton();
        } catch (error) {
            console.error('Error initializing crypto address assignment:', error);
            alert('Error loading crypto addresses. Please check the console for details.');
        }
    }
    
    /**
     * Load addresses from a CSV file
     */
    async function loadCsvFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load CSV file: ${filePath}`);
            }
            
            const text = await response.text();
            // Parse CSV - assuming one address per line
            return text.split('\n')
                .map(line => line.trim())
                .filter(line => line !== '');
        } catch (error) {
            console.error(`Error loading CSV file ${filePath}:`, error);
            // Return empty array to allow the app to continue with warnings
            return [];
        }
    }
    
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
        // Get user ID (email) from URL or localStorage
        const userId = getUserId();
        
        if (!userId) {
            alert('Error: User identification required to view deposit addresses.');
            return;
        }
        
        // Get or assign crypto addresses for this user
        const addresses = getOrAssignAddresses(userId);
        
        if (!addresses) {
            alert('Error: Could not assign crypto addresses. Please contact support.');
            return;
        }
        
        // Show addresses in modal
        showAddressesModal(addresses);
    }
    
    /**
     * Get user ID from URL parameters or localStorage
     */
    function getUserId() {
        // Try to get email from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        let userId = urlParams.get('email');
        
        // If not in URL, try localStorage
        if (!userId) {
            userId = localStorage.getItem('userEmail');
            
            // If still not found, prompt user
            if (!userId) {
                userId = prompt("Please enter your email to view deposit addresses:", "");
                
                if (userId) {
                    localStorage.setItem('userEmail', userId);
                }
            }
        }
        
        return userId;
    }
    
    /**
     * Get existing or assign new crypto addresses for a user
     */
    function getOrAssignAddresses(userId) {
        // Check if addresses are already assigned
        const allAssignments = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}');
        
        // If user already has assignments, return them
        if (allAssignments[userId]) {
            return allAssignments[userId];
        }
        
        // Otherwise, assign new addresses
        if (!window.cryptoAddresses) {
            console.error('Crypto addresses not loaded');
            return null;
        }
        
        // Find available addresses
        const bitcoinAddress = findUnassignedAddress('bitcoin', allAssignments);
        const ethereumAddress = findUnassignedAddress('ethereum', allAssignments);
        const usdtAddress = findUnassignedAddress('usdt', allAssignments);
        
        // Check if we have all addresses
        if (!bitcoinAddress || !ethereumAddress || !usdtAddress) {
            console.error('Not enough addresses available');
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
        
        // Save assignment
        allAssignments[userId] = newAssignment;
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(allAssignments));
        
        console.log('Assigned addresses to user:', userId, newAssignment);
        return newAssignment;
    }
    
    /**
     * Find an unassigned address for a specific crypto type
     */
    function findUnassignedAddress(cryptoType, allAssignments) {
        // Get all addresses of this type
        const addresses = window.cryptoAddresses[cryptoType];
        
        if (!addresses || addresses.length === 0) {
            console.error(`No ${cryptoType} addresses available`);
            return null;
        }
        
        // Get all assigned addresses of this type
        const assignedAddresses = Object.values(allAssignments)
            .map(assignment => assignment[cryptoType]);
        
        // Find an unassigned address
        const unassignedAddress = addresses.find(address => 
            !assignedAddresses.includes(address)
        );
        
        if (!unassignedAddress) {
            console.error(`All ${cryptoType} addresses are already assigned`);
            return null;
        }
        
        return unassignedAddress;
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
        heading.textContent = 'Your Crypto Deposit Addresses';
        heading.style.marginTop = '0';
        heading.style.color = '#333';
        content.appendChild(heading);
        
        // Add description
        const description = document.createElement('p');
        description.textContent = 'These addresses are uniquely assigned to your account. Send your crypto to these addresses:';
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
        input.value = address;
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
        addressContainer.appendChild(copyButton);
        
        section.appendChild(addressContainer);
        container.appendChild(section);
    }
    
    // Add a debug function to view all assignments
    window.viewAllCryptoAssignments = function() {
        const assignments = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}');
        console.table(assignments);
        return assignments;
    };
    
    // Add a debug function to clear all assignments
    window.clearAllCryptoAssignments = function() {
        localStorage.removeItem(CONFIG.storageKey);
        console.log('All crypto address assignments cleared');
    };
})();
