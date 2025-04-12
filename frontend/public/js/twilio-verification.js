/**
 * twilio-verification.js - Compatible version
 * Simplified and cross-browser compatible
 */

// DOM Elements
var signupForm = document.getElementById('signupForm');
var verificationForm = document.getElementById('verificationForm');
var resendCodeButton = document.getElementById('resend-code');
var statusMessage = document.getElementById('statusMessage');

// User information storage for the verification process
var pendingUser = {};

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (signupForm) {
        signupForm.addEventListener('submit', handleInitialSignup);
    }
    
    if (verificationForm) {
        verificationForm.addEventListener('submit', handleVerification);
    }
    
    if (resendCodeButton) {
        resendCodeButton.addEventListener('click', handleResendCode);
    }
});

/**
 * Handles the initial signup form submission
 */
function handleInitialSignup(event) {
    event.preventDefault();
    
    // Clear previous status messages
    clearStatus();
    
    // Form validation
    if (!validateSignupForm()) {
        return;
    }
    
    // Collect form data
    pendingUser = {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value
    };
    
    // Add invitation code if element exists
    var invitationCode = document.getElementById('invitation-code');
    if (invitationCode) {
        pendingUser.invitationCode = invitationCode.value.trim() || null;
    }
    
    // Simple check for phone number format
    if (!pendingUser.phone.startsWith('+')) {
        showStatus('Phone number must start with "+" and include country code (e.g., +15873304312)', 'error');
        return;
    }
    
    // Show status
    showStatus('Sending verification code...', 'info');
    
    // Call API to initiate verification
    fetch(window.location.origin + '/api/auth/verify/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: pendingUser.phone })
    })
    .then(function(response) {
        if (!response.ok) {
            return response.json().then(function(data) {
                throw new Error(data.message || 'Failed to send verification code');
            });
        }
        return response.json();
    })
    .then(function(data) {
        // Show verification form
        signupForm.style.display = 'none';
        verificationForm.style.display = 'block';
        showStatus('Verification code sent! Please check your phone.', 'success');
    })
    .catch(function(error) {
        showStatus(error.message || 'An error occurred during verification', 'error');
        console.error('Verification error:', error);
    });
}

/**
 * Handles the verification code submission
 */
function handleVerification(event) {
    event.preventDefault();
    
    // Clear previous status messages
    clearStatus();
    
    var verificationCode = document.getElementById('verification-code').value.trim();
    
    if (!verificationCode) {
        showStatus('Please enter the verification code', 'error');
        return;
    }
    
    // Show status
    showStatus('Verifying code...', 'info');
    
    // Call API to verify code
    fetch(window.location.origin + '/api/auth/verify/check', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            phone: pendingUser.phone,
            code: verificationCode
        })
    })
    .then(function(response) {
        if (!response.ok) {
            return response.json().then(function(data) {
                throw new Error(data.message || 'Invalid verification code');
            });
        }
        return response.json();
    })
    .then(function() {
        // If verification successful, complete the signup
        showStatus('Phone verified! Creating your account...', 'success');
        
        return fetch(window.location.origin + '/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pendingUser)
        });
    })
    .then(function(response) {
        if (!response.ok) {
            return response.json().then(function(data) {
                throw new Error(data.message || 'Failed to create account');
            });
        }
        return response.json();
    })
    .then(function(data) {
        // Handle successful signup
        showStatus('Account created successfully! Redirecting to login...', 'success');
        
        // Store token if provided
        if (data.token) {
            localStorage.setItem('auth_token', data.token);
            setTimeout(function() { window.location.href = 'dashboard.html'; }, 1500);
        } else {
            // If no token, redirect to login
            setTimeout(function() { window.location.href = 'index.html'; }, 1500);
        }
    })
    .catch(function(error) {
        showStatus(error.message || 'Verification failed', 'error');
        console.error('Verification error:', error);
    });
}

/**
 * Handles resending the verification code
 */
function handleResendCode() {
    // Clear previous status messages
    clearStatus();
    
    // Show status
    showStatus('Resending verification code...', 'info');
    
    // Call API to resend code
    fetch(window.location.origin + '/api/auth/verify/resend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: pendingUser.phone })
    })
    .then(function(response) {
        if (!response.ok) {
            return response.json().then(function(data) {
                throw new Error(data.message || 'Failed to resend verification code');
            });
        }
        return response.json();
    })
    .then(function() {
        showStatus('New verification code sent!', 'success');
    })
    .catch(function(error) {
        showStatus(error.message || 'Failed to resend code', 'error');
        console.error('Resend code error:', error);
    });
}

/**
 * Validates the signup form fields
 */
function validateSignupForm() {
    // Get form values
    var username = document.getElementById('username').value.trim();
    var email = document.getElementById('email').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirm-password').value;
    var privacyPolicy = document.getElementById('privacy-policy').checked;
    
    // Validation checks
    if (!username) {
        showStatus('Username is required', 'error');
        return false;
    }
    
    if (!email || !isValidEmail(email)) {
        showStatus('Please enter a valid email address', 'error');
        return false;
    }
    
    if (!phone || !phone.startsWith('+')) {
        showStatus('Please enter a valid phone number with country code (e.g., +15873304312)', 'error');
        return false;
    }
    
    if (!password || password.length < 8) {
        showStatus('Password must be at least 8 characters long', 'error');
        return false;
    }
    
    if (password !== confirmPassword) {
        showStatus('Passwords do not match', 'error');
        return false;
    }
    
    if (!privacyPolicy) {
        showStatus('You must agree to the Privacy Policy', 'error');
        return false;
    }
    
    return true;
}

/**
 * Validates an email address format
 */
function isValidEmail(email) {
    // Simple email check
    return email.includes('@') && email.includes('.');
}

/**
 * Displays a status message to the user
 */
function showStatus(message, type) {
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
 * Clears the status message
 */
function clearStatus() {
    if (statusMessage) {
        statusMessage.textContent = '';
        statusMessage.style.display = 'none';
    }
}
