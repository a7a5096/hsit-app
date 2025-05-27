/**
 * HSIT App - API-Based Crypto Deposit Address Manager
 * This script handles fetching unique crypto wallet addresses from the backend API
 */

class CryptoAddressManager {
    constructor() {
        this.apiUrl = window.location.origin;
    }

    /**
     * Initialize the manager
     */
    async initialize() {
        try {
            console.log('Crypto address manager initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing crypto address manager:', error);
            return false;
        }
    }

    /**
     * Fetch addresses from the backend API
     * @param {string} userId - Unique identifier for the user (not used in API call as token is used)
     * @returns {Promise<Object>} - Object containing assigned addresses
     */
    async fetchAddressesFromAPI() {
        try {
            // Get auth token from localStorage
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error('No authentication token found');
                throw new Error('Authentication required');
            }
            
            // Make API request to get addresses
            const response = await fetch(`${this.apiUrl}/api/crypto/addresses`, {
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
                userId: 'current-user', // Not needed as we use token authentication
                bitcoin: data.addresses.bitcoin,
                ethereum: data.addresses.ethereum,
                usdt: data.addresses.usdt,
                assignedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching addresses from API:', error);
            throw error;
        }
    }
    
    /**
     * Get assigned addresses for a user
     * @param {string} userId - Unique identifier for the user (not used in API call as token is used)
     * @returns {Promise<Object>} - Object containing assigned addresses
     */
    async getAssignedAddresses(userId) {
        try {
            return await this.fetchAddressesFromAPI();
        } catch (error) {
            console.error('Error getting assigned addresses:', error);
            return null;
        }
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
            
            // Fetch addresses from API
            cryptoAddressManager.getAssignedAddresses()
                .then(assignment => {
                    if (assignment) {
                        // Show deposit modal with addresses
                        showDepositModal(assignment);
                    } else {
                        showNotification('Error: Could not fetch crypto addresses. Please try again or contact support.', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error fetching addresses:', error);
                    if (error.message === 'Authentication required') {
                        showNotification('Please log in to view your deposit addresses.', 'error');
                    } else {
                        showNotification('Error: Could not fetch crypto addresses. Please try again or contact support.', 'error');
                    }
                });
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
                    <input type="text" value="${assignment.bitcoin || 'No address available'}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="copyToClipboard('${assignment.bitcoin}')" ${!assignment.bitcoin ? 'disabled style="background-color: #cccccc; cursor: not-allowed;"' : ''} style="margin-left: 10px; padding: 8px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h3 style="margin-bottom: 5px; color: #627eea;">Ethereum</h3>
                <div style="display: flex; align-items: center;">
                    <input type="text" value="${assignment.ethereum || 'No address available'}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="copyToClipboard('${assignment.ethereum}')" ${!assignment.ethereum ? 'disabled style="background-color: #cccccc; cursor: not-allowed;"' : ''} style="margin-left: 10px; padding: 8px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="margin-bottom: 5px; color: #26a17b;">USDT</h3>
                <div style="display: flex; align-items: center;">
                    <input type="text" value="${assignment.usdt || 'No address available'}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <button onclick="copyToClipboard('${assignment.usdt}')" ${!assignment.usdt ? 'disabled style="background-color: #cccccc; cursor: not-allowed;"' : ''} style="margin-left: 10px; padding: 8px 12px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="closeModal()" style="padding: 10px 20px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    
    // Add copy to clipboard function
    window.copyToClipboard = function(text) {
        if (!text) return;
        
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
