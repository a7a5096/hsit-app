/**
 * auth.js
 * 
 * Authentication utilities for the application.
 * Handles login, logout, and auth token management.
 */

// Login form handling
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

/**
 * Handles login form submission
 * @param {Event} event - The form submission event
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const statusMessage = document.getElementById('statusMessage');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    try {
        // Clear previous status messages
        if (statusMessage) {
            statusMessage.textContent = '';
            statusMessage.style.display = 'none';
        }
        
        // Validate form data
        if (!email || !password) {
            showStatus('Please enter both email and password', 'error');
            return;
        }
        
        showStatus('Signing in...', 'info');
        
        // Call login API
        const response = await fetch(`${window.location.origin}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Save auth token
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
            
            // Redirect to dashboard
            showStatus('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            throw new Error('No authentication token received');
        }
        
    } catch (error) {
        showStatus(error.message || 'An error occurred during login', 'error');
        console.error('Login error:', error);
    }
}

/**
 * Displays a status message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (info, success, error)
 */
function showStatus(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
    } else {
        // Fallback if status message element doesn't exist
        alert(message);
    }
}

/**
 * Checks if the user is authenticated
 * @returns {boolean} Whether the user is authenticated
 */
function isAuthenticated() {
    return !!localStorage.getItem('auth_token');
}

/**
 * Gets the current authentication token
 * @returns {string|null} The authentication token or null if not authenticated
 */
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

/**
 * Logs the user out
 */
function logout() {
    localStorage.removeItem('auth_token');
    window.location.href = 'index.html';
}

// For protected pages, redirect if not logged in
document.addEventListener('DOMContentLoaded', () => {
    // Check if this is a protected page
    const requiresAuth = document.body.classList.contains('requires-auth');
    
    if (requiresAuth && !isAuthenticated()) {
        window.location.href = 'index.html?require_login=true';
    }
    
    // Setup logout button if it exists
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});
