/**
 * twilio-verification.js
 * 
 * Handles the Twilio SMS verification process during signup.
 * This script manages the two-step verification process:
 * 1. Initial form submission - sends phone number to backend for verification code
 * 2. Code verification - validates the code entered by the user
 */

// DOM Elements
const signupForm = document.getElementById('signupForm');
const verificationForm = document.getElementById('verificationForm');
const resendCodeButton = document.getElementById('resend-code');
const statusMessage = document.getElementById('statusMessage');

// User information storage for the verification process
let pendingUser = {};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    signupForm.addEventListener('submit', handleInitialSignup);
    verificationForm.addEventListener('submit', handleVerification);
    resendCodeButton.addEventListener('click', handleResendCode);
});

/**
 * Handles the initial signup form submission
 * @param {Event} event - The form submission event
 */
async function handleInitialSignup(event) {
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
        password: document.getElementById('password').value,
        invitationCode: document.getElementById('invitation-code').value.trim() || null
    };
    
    try {
        // Call API to initiate verification
        showStatus('Sending verification code...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/auth/verify/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: pendingUser.phone })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to send verification code');
        }
        
        // Show verification form
        signupForm.style.display = 'none';
        verificationForm.style.display = 'block';
        showStatus('Verification code sent! Please check your phone.', 'success');
        
    } catch (error) {
        showStatus(error.message || 'An error occurred during verification', 'error');
        console.error('Verification error:', error);
    }
}

/**
 * Handles the verification code submission
 * @param {Event} event - The form submission event
 */
async function handleVerification(event) {
    event.preventDefault();
    
    // Clear previous status messages
    clearStatus();
    
    const verificationCode = document.getElementById('verification-code').value.trim();
    
    if (!verificationCode) {
        showStatus('Please enter the verification code', 'error');
        return;
    }
    
    try {
        // Call API to verify code
        showStatus('Verifying code...', 'info');
        
        const verifyResponse = await fetch(`${API_BASE_URL}/api/auth/verify/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                phone: pendingUser.phone,
                code: verificationCode
            })
        });
        
        const verifyData = await verifyResponse.json();
        
        if (!verifyResponse.ok) {
            throw new Error(verifyData.message || 'Invalid verification code');
        }
        
        // If verification successful, complete the signup
        showStatus('Phone verified! Creating your account...', 'success');
        
        const signupResponse = await fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pendingUser)
        });
        
        const signupData = await signupResponse.json();
        
        if (!signupResponse.ok) {
            throw new Error(signupData.message || 'Failed to create account');
        }
        
        // Handle successful signup
        showStatus('Account created successfully! Redirecting to login...', 'success');
        
        // Store token if provided
        if (signupData.token) {
            localStorage.setItem('auth_token', signupData.token);
            setTimeout(() => window.location.href = 'dashboard.html', 1500);
        } else {
            // If no token, redirect to login
            setTimeout(() => window.location.href = 'index.html', 1500);
        }
        
    } catch (error) {
        showStatus(error.message || 'Verification failed', 'error');
        console.error('Verification error:', error);
    }
}

/**
 * Handles resending the verification code
 */
async function handleResendCode() {
    // Clear previous status messages
    clearStatus();
    
    try {
        showStatus('Resending verification code...', 'info');
        
        const response = await fetch(`${API_BASE_URL}/api/auth/verify/resend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: pendingUser.phone })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to resend verification code');
        }
        
        showStatus('New verification code sent!', 'success');
        
    } catch (error) {
        showStatus(error.message || 'Failed to resend code', 'error');
        console.error('Resend code error:', error);
    }
}

/**
 * Validates the signup form fields
 * @returns {boolean} - Whether the form is valid
 */
function validateSignupForm() {
    // Get form values
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const privacyPolicy = document.getElementById('privacy-policy').checked;
    
    // Validation checks
    if (!username) {
        showStatus('Username is required', 'error');
        return false;
    }
    
    if (!email || !isValidEmail(email)) {
        showStatus('Please enter a valid email address', 'error');
        return false;
    }
    
    if (!phone || !isValidPhone(phone)) {
        showStatus('Please enter a valid phone number with country code (e.g., +1234567890)', 'error');
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
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates a phone number format (basic check for + and digits)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
function isValidPhone(phone) {
    // Basic validation for phone with country code
    // Format should be +[country code][number] e.g., +1234567890
    const phoneRegex = /^\+[0-9]{6,15}$/;
    return phoneRegex.test(phone);
}

/**
 * Displays a status message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (info, success, error)
 */
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
}

/**
 * Clears the status message
 */
function clearStatus() {
    statusMessage.textContent = '';
    statusMessage.style.display = 'none';
}
