/**
 * twilio-verification.js - Frontend handler for phone verification
 * Fixed version that avoids pattern matching errors
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
        password: document.getElementById('password').value
    };
    
    // Add invitation code if element exists
    const invitationCode = document.getElementById('invitation-code');
    if (invitationCode) {
        pendingUser.invitationCode = invitationCode.value.trim() || null;
    }
    
    try {
    // Call API to initiate verification
    showStatus('Sending verification code...', 'info');
    
    // Simple check for phone number format (without regex)
    const phone = document.getElementById('phone').value.trim();
    if (!phone.startsWith('+')) {
        showStatus('Phone number must start with "+" and include country code (e.g., +15873304312)', 'error');
        return;
    }
    
    const response = await fetch(`${window.location.origin}/api/auth/verify/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: phone })
    });
    
    // Safely handle the response
    let responseData;
    try {
        responseData = await response.json();
    } catch (parseError) {
        console.error('Error parsing response:', parseError);
        responseData = { message: 'Invalid response from server' };
    }
    
    if (!response.ok) {
        throw new Error(responseData.message || 'Failed to send verification code');
    }
    
    // Show verification form
    signupForm.style.display = 'none';
    verificationForm.style.display = 'block';
    showStatus('Verification code sent! Please check your phone.', 'success');
    
} catch (error) {
    showStatus('An error occurred during verification: ' + error.message, 'error');
    console.error('Verification error:', error);
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
        
        const verifyResponse = await fetch(`${window.location.origin}/api/auth/verify/check`, {
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
        
        const signupResponse = await fetch(`${window.location.origin}/api/auth/signup`, {
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
        
        const response = await fetch(`${window.location.origin}/api/auth/verify/resend`, {
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
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function isValidEmail(email) {
    // Simple email check
    return email.includes('@') && email.includes('.');
}

/**
 * Displays a status message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (info, success, error)
 */
function showStatus(message, type = 'info') {
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
 * Clears the status message
 */
function clearStatus() {
    if (statusMessage) {
        statusMessage.textContent = '';
        statusMessage.style.display = 'none';
    }
}
