/**
 * auth.js
 * 
 * Authentication utilities for the application.
 * Handles login, logout, and auth token management.
 */
// Login form handling
document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

/**
 * Handles login form submission
 * @param {Event} event - The form submission event
 */
function handleLogin(event) {
    event.preventDefault();
    
    var statusMessage = document.getElementById('statusMessage');
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    
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
    
    // Call login API using XMLHttpRequest (more compatible)
    var xhr = new XMLHttpRequest();
    // Fix: Use the correct backend URL and endpoint
    xhr.open('POST', 'https://hsit-backend.onrender.com/api/auth', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    // Save auth token
                    if (data.token) {
                        localStorage.setItem('auth_token', data.token);
                        
                        // Redirect to dashboard
                        showStatus('Login successful! Redirecting...', 'success');
                        setTimeout(function() {
                            window.location.href = 'dashboard.html';
                        }, 1000);
                    } else {
                        showStatus('No authentication token received', 'error');
                    }
                } catch (e) {
                    showStatus('Error parsing server response', 'error');
                }
            } else {
                try {
                    var response = JSON.parse(xhr.responseText);
                    showStatus(response.message || 'Login failed', 'error');
                } catch (e) {
                    showStatus('Login failed', 'error');
                }
            }
        }
    };
    xhr.send(JSON.stringify({
        email: email,
        password: password
    }));
}

/**
 * Displays a status message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (info, success, error)
 */
function showStatus(message, type) {
    var statusMessage = document.getElementById('statusMessage');
    if (!type) type = 'info';
    
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + type;
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
document.addEventListener('DOMContentLoaded', function() {
    // Check if this is a protected page
    var requiresAuth = document.body.classList.contains('requires-auth');
    
    if (requiresAuth && !isAuthenticated()) {
        window.location.href = 'index.html?require_login=true';
    }
    
    // Setup logout button if it exists
    var logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});
