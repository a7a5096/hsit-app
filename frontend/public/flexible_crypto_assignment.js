/**
 * HSIT App - CSV Path Fix for Crypto Deposit Address Assignment
 * This script handles assigning unique crypto wallet addresses to users
 * with flexible CSV file path handling
 */

// Self-executing function to avoid global namespace pollution
(function() {
    // Configuration - with multiple possible paths for each file
    const CONFIG = {
        csvPaths: {
            bitcoin: [
                '/csv/bitcoin.csv',
                '/csv/Bitcoin.csv',
                '/Bitcoin.csv',
                '/bitcoin.csv',
                './csv/bitcoin.csv',
                './Bitcoin.csv',
                './bitcoin.csv'
            ],
            ethereum: [
                '/csv/ethereum.csv',
                '/csv/Ethereum.csv',
                '/Ethereum.csv',
                '/ethereum.csv',
                './csv/ethereum.csv',
                './Ethereum.csv',
                './ethereum.csv'
            ],
            usdt: [
                '/csv/USDT.csv',
                '/csv/usdt.csv',
                '/csv/Usdt.csv',
                '/USDT.csv',
                '/usdt.csv',
                '/Usdt.csv',
                './csv/USDT.csv',
                './csv/usdt.csv',
                './USDT.csv',
                './usdt.csv'
            ]
        },
        storageKey: 'hsit_crypto_assignments',
        // Fallback addresses in case CSV files can't be loaded
        fallbackAddresses: {
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
        }
    };
    
    // Store loaded addresses
    const cryptoAddresses = {
        bitcoin: [],
        ethereum: [],
        usdt: []
    };
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing crypto address assignment with flexible CSV paths...');
        initCryptoAssignment();
    });
    
    /**
     * Initialize the crypto address assignment system
     */
    async function initCryptoAssignment() {
        try {
            // Try to load addresses from CSV files with multiple path attempts
            await loadAddressesWithMultiplePaths('bitcoin');
            await loadAddressesWithMultiplePaths('ethereum');
            await loadAddressesWithMultiplePaths('usdt');
            
            console.log(`Loaded ${cryptoAddresses.bitcoin.length} Bitcoin addresses`);
            console.log(`Loaded ${cryptoAddresses.ethereum.length} Ethereum addresses`);
            console.log(`Loaded ${cryptoAddresses.usdt.length} USDT addresses`);
            
            // If any crypto type has no addresses, use fallback addresses
            if (cryptoAddresses.bitcoin.length === 0) {
                console.log('Using fallback Bitcoin addresses');
                cryptoAddresses.bitcoin = CONFIG.fallbackAddresses.bitcoin;
            }
            
            if (cryptoAddresses.ethereum.length === 0) {
                console.log('Using fallback Ethereum addresses');
                cryptoAddresses.ethereum = CONFIG.fallbackAddresses.ethereum;
            }
            
            if (cryptoAddresses.usdt.length === 0) {
                console.log('Using fallback USDT addresses');
                cryptoAddresses.usdt = CONFIG.fallbackAddresses.usdt;
            }
            
            // Find and set up the deposit button
            setupDepositButton();
        } catch (error) {
            console.error('Error initializing crypto address assignment:', error);
            // Use fallback addresses if there's an error
            cryptoAddresses.bitcoin = CONFIG.fallbackAddresses.bitcoin;
            cryptoAddresses.ethereum = CONFIG.fallbackAddresses.ethereum;
            cryptoAddresses.usdt = CONFIG.fallbackAddresses.usdt;
            setupDepositButton();
        }
    }
    
    /**
     * Try to load addresses from multiple possible CSV file paths
     */
    async function loadAddressesWithMultiplePaths(cryptoType) {
        const paths = CONFIG.csvPaths[cryptoType];
        let loaded = false;
        
        // Try each path until one works
        for (let i = 0; i < paths.length; i++) {
            try {
                const addresses = await loadCsvFile(paths[i]);
                if (addresses && addresses.length > 0) {
                    cryptoAddresses[cryptoType] = addresses;
                    console.log(`Successfully loaded ${cryptoType} addresses from ${paths[i]}`);
                    loaded = true;
                    break;
                }
            } catch (error) {
                console.log(`Failed to load ${cryptoType} addresses from ${paths[i]}: ${error.message}`);
                // Continue to next path
            }
        }
        
        if (!loaded) {
            console.warn(`Could not load ${cryptoType} addresses from any path`);
        }
    }
    
    /**
     * Load addresses from a CSV file
     */
    async function loadCsvFile(filePath) {
        try {
            console.log(`Attempting to load CSV from: ${filePath}`);
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load CSV file: ${filePath} (${response.status})`);
            }
            
            const text = await response.text();
            // Parse CSV - assuming one address per line
            const addresses = text.split('\n')
                .map(line => line.trim())
                .filter(line => line !== '');
            
            console.log(`Loaded ${addresses.length} addresses from ${filePath}`);
            return addresses;
        } catch (error) {
            console.error(`Error loading CSV file ${filePath}:`, error);
            throw error;
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
        const addresses = cryptoAddresses[cryptoType];
        
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
    
    // Add debug functions
    window.viewAllCryptoAddresses = function() {
        console.log('Available Bitcoin addresses:', cryptoAddresses.bitcoin.length);
        console.log('Available Ethereum addresses:', cryptoAddresses.ethereum.length);
        console.log('Available USDT addresses:', cryptoAddresses.usdt.length);
        return cryptoAddresses;
    };
    
    window.viewAllCryptoAssignments = function() {
        const assignments = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}');
        console.table(assignments);
        return assignments;
    };
    
    window.clearAllCryptoAssignments = function() {
        localStorage.removeItem(CONFIG.storageKey);
        console.log('All crypto address assignments cleared');
    };
})();
