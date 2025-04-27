/**
 * HSIT App - Crypto Deposit Address Assignment
 * This script handles assigning unique crypto wallet addresses to users
 * from bitcoin.csv, ethereum.csv, and USDT.csv files
 */

// This would typically be integrated with your backend system
// The following is a client-side implementation for demonstration

class CryptoAddressManager {
    constructor() {
        this.bitcoinAddresses = []; // Will be loaded from bitcoin.csv
        this.ethereumAddresses = []; // Will be loaded from ethereum.csv
        this.usdtAddresses = []; // Will be loaded from USDT.csv
        this.assignedAddresses = {}; // Track which addresses are assigned to which users
    }

    /**
     * Initialize by loading addresses from CSV files
     * In a real implementation, this would be done server-side
     */
    async initialize() {
        try {
            // In a real implementation, these would be loaded from your server
            // For demonstration, we're showing how it would work
            await this.loadAddressesFromCSV('bitcoin');
            await this.loadAddressesFromCSV('ethereum');
            await this.loadAddressesFromCSV('usdt');
            console.log('Crypto address manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing crypto address manager:', error);
            return false;
        }
    }

    /**
     * Load addresses from a CSV file
     * In a real implementation, this would be done server-side
     */
    async loadAddressesFromCSV(cryptoType) {
        // This is a mock implementation since we don't have direct access to the CSV files
        // In a real implementation, you would fetch this data from your server
        
        // Simulating loading addresses from CSV files
        console.log(`Loading ${cryptoType} addresses from CSV...`);
        
        // In a real implementation, you would use fetch or another method to get the data
        /*
        const response = await fetch(`/api/crypto-addresses/${cryptoType}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${cryptoType} addresses`);
        }
        const addresses = await response.json();
        */
        
        // For demonstration, we're using placeholder addresses
        const placeholderAddresses = this.getPlaceholderAddresses(cryptoType);
        
        // Store the addresses in the appropriate array
        if (cryptoType === 'bitcoin') {
            this.bitcoinAddresses = placeholderAddresses;
        } else if (cryptoType === 'ethereum') {
            this.ethereumAddresses = placeholderAddresses;
        } else if (cryptoType === 'usdt') {
            this.usdtAddresses = placeholderAddresses;
        }
        
        console.log(`Loaded ${placeholderAddresses.length} ${cryptoType} addresses`);
    }
    
    /**
     * Get placeholder addresses for demonstration
     * In a real implementation, these would come from your CSV files
     */
    getPlaceholderAddresses(cryptoType) {
        // These are just examples and should be replaced with your actual addresses
        if (cryptoType === 'bitcoin') {
            return [
                '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
                'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
                // Add more addresses as needed
            ];
        } else if (cryptoType === 'ethereum') {
            return [
                '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f44f',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f450',
                // Add more addresses as needed
            ];
        } else if (cryptoType === 'usdt') {
            return [
                '0x742d35Cc6634C0532925a3b844Bc454e4438f451',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f452',
                '0x742d35Cc6634C0532925a3b844Bc454e4438f453',
                // Add more addresses as needed
            ];
        }
        return [];
    }

    /**
     * Assign crypto addresses to a user
     * @param {string} userId - Unique identifier for the user
     * @returns {Object} - Object containing assigned addresses
     */
    assignAddressesToUser(userId) {
        // Check if user already has assigned addresses
        if (this.assignedAddresses[userId]) {
            return this.assignedAddresses[userId];
        }
        
        // Find unassigned addresses
        const bitcoinAddress = this.findUnassignedAddress('bitcoin');
        const ethereumAddress = this.findUnassignedAddress('ethereum');
        const usdtAddress = this.findUnassignedAddress('usdt');
        
        // Check if we have addresses available
        if (!bitcoinAddress || !ethereumAddress || !usdtAddress) {
            console.error('Not enough addresses available for assignment');
            return null;
        }
        
        // Create assignment
        const assignment = {
            userId,
            bitcoin: bitcoinAddress,
            ethereum: ethereumAddress,
            usdt: usdtAddress,
            assignedAt: new Date().toISOString()
        };
        
        // Store assignment
        this.assignedAddresses[userId] = assignment;
        
        // In a real implementation, you would save this to your database
        this.saveAssignmentToDatabase(assignment);
        
        return assignment;
    }
    
    /**
     * Find an unassigned address for a specific crypto type
     */
    findUnassignedAddress(cryptoType) {
        let addressPool = [];
        
        if (cryptoType === 'bitcoin') {
            addressPool = this.bitcoinAddresses;
        } else if (cryptoType === 'ethereum') {
            addressPool = this.ethereumAddresses;
        } else if (cryptoType === 'usdt') {
            addressPool = this.usdtAddresses;
        }
        
        // Get all assigned addresses of this type
        const assignedAddresses = Object.values(this.assignedAddresses)
            .map(assignment => assignment[cryptoType]);
        
        // Find an address that hasn't been assigned yet
        const unassignedAddress = addressPool.find(address => 
            !assignedAddresses.includes(address)
        );
        
        return unassignedAddress;
    }
    
    /**
     * Save assignment to database (mock implementation)
     * In a real implementation, this would make an API call to your backend
     */
    saveAssignmentToDatabase(assignment) {
        console.log('Saving address assignment to database:', assignment);
        
        // In a real implementation, you would make an API call here
        /*
        fetch('/api/crypto-addresses/assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(assignment),
        })
        .then(response => response.json())
        .then(data => {
            console.log('Assignment saved successfully:', data);
        })
        .catch((error) => {
            console.error('Error saving assignment:', error);
        });
        */
    }
    
    /**
     * Get assigned addresses for a user
     */
    getAssignedAddresses(userId) {
        return this.assignedAddresses[userId] || null;
    }
    
    /**
     * Get all assigned addresses
     */
    getAllAssignedAddresses() {
        return this.assignedAddresses;
    }
}

// Initialize the crypto address manager
const cryptoAddressManager = new CryptoAddressManager();

// Add event listener for the deposit button
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the crypto address manager
    cryptoAddressManager.initialize().then(success => {
        if (success) {
            setupDepositButton();
        } else {
            console.error('Failed to initialize crypto address manager');
        }
    });
});

/**
 * Set up the deposit button functionality
 */
function setupDepositButton() {
    const depositButton = document.querySelector('a[href="#"].operation-card:nth-child(3)');
    
    if (depositButton) {
        depositButton.addEventListener('click', function(event) {
            event.preventDefault();
            
            // Get user ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const userEmail = urlParams.get('email');
            
            if (!userEmail) {
                showNotification('Error: User not properly authenticated. Please log in again.', 'error');
                return;
            }
            
            // Use email as user ID for demonstration
            const userId = userEmail;
            
            // Assign addresses to user
            const assignment = cryptoAddressManager.assignAddressesToUser(userId);
            
            if (assignment) {
                // Show deposit modal with addresses
                showDepositModal(assignment);
            } else {
                showNotification('Error: Could not assign crypto addresses. Please contact support.', 'error');
            }
        });
    }
}

/**
 * Show deposit modal with assigned addresses
 */
function showDepositModal(assignment) {
    // Create modal container if it doesn't exist
    let modal = document.getElementById('deposit-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deposit-modal';
        document.body.appendChild(modal);
        
        // Add styles
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
    }
    
    // Create modal content
    modal.innerHTML = `
        <div style="background-color: #fff; padding: 20px; border-radius: 5px; max-width: 500px; width: 90%;">
            <h2 style="margin-top: 0; color: #333;">Deposit Crypto</h2>
            <p>Please send your crypto to the following addresses:</p>
            
            <div style="margin-bottom: 15px;">
                <h3 style="margin-bottom: 5px; color: #f7931a;">Bitcoin</h3>
                <div style="display: flex; align-items: center;">
                    <input type="text" value="${assignment.bitcoin}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="copyToClipboard('${assignment.bitcoin}')" style="margin-left: 10px; padding: 8px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h3 style="margin-bottom: 5px; color: #627eea;">Ethereum</h3>
                <div style="display: flex; align-items: center;">
                    <input type="text" value="${assignment.ethereum}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="copyToClipboard('${assignment.ethereum}')" style="margin-left: 10px; padding: 8px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 5px; color: #26a17b;">USDT</h3>
                <div style="display: flex; align-items: center;">
                    <input type="text" value="${assignment.usdt}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="copyToClipboard('${assignment.usdt}')" style="margin-left: 10px; padding: 8px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="closeModal()" style="padding: 10px 20px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    
    // Add copy to clipboard function
    window.copyToClipboard = function(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification('Address copied to clipboard!', 'success');
    };
    
    // Add close modal function
    window.closeModal = function() {
        modal.style.display = 'none';
    };
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Show a notification to the user
 */
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('hsit-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'hsit-notification';
        document.body.appendChild(notification);
        
        // Add styles
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '5px';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        notification.style.zIndex = '1000';
        notification.style.maxWidth = '300px';
        notification.style.transition = 'all 0.3s ease-in-out';
    }
    
    // Set type-specific styles
    if (type === 'success') {
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#F44336';
        notification.style.color = 'white';
    } else {
        notification.style.backgroundColor = '#2196F3';
        notification.style.color = 'white';
    }
    
    // Set message
    notification.textContent = message;
    
    // Show notification
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
    
    // Hide after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        // Remove from DOM after fade out
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}
