// Simple, cross-browser compatible verification handler
var pendingUser = {};

document.addEventListener('DOMContentLoaded', function() {
    var signupForm = document.getElementById('signupForm');
    var verificationForm = document.getElementById('verificationForm');
    var resendButton = document.getElementById('resend-code');
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    if (verificationForm) {
        verificationForm.addEventListener('submit', handleVerification);
    }
    
    if (resendButton) {
        resendButton.addEventListener('click', handleResend);
    }
});

function handleSignup(event) {
    event.preventDefault();
    
    // Clear any status messages
    showStatus('', '');
    
    // Collect form data
    var username = document.getElementById('username').value.trim();
    var email = document.getElementById('email').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirm-password').value;
    var privacyPolicy = document.getElementById('privacy-policy').checked;
    
    // Validate inputs
    if (!username) {
        return showStatus('Username is required', 'error');
    }
    
    if (!email || email.indexOf('@') === -1) {
        return showStatus('Valid email is required', 'error');
    }
    
    if (!phone || !phone.startsWith('+')) {
        return showStatus('Phone number must start with + and include country code', 'error');
    }
    
    if (!password || password.length < 8) {
        return showStatus('Password must be at least 8 characters', 'error');
    }
    
    if (password !== confirmPassword) {
        return showStatus('Passwords do not match', 'error');
    }
    
    if (!privacyPolicy) {
        return showStatus('You must agree to the Privacy Policy', 'error');
    }
    
    // Store user data for verification
    pendingUser = {
        username: username,
        email: email,
        phone: phone,
        password: password
    };
    
    // Send verification request
    showStatus('Sending verification code...', 'info');
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', window.location.origin + '/api/auth/verify/start', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // Show verification form
                document.getElementById('signupForm').style.display = 'none';
                document.getElementById('verificationForm').style.display = 'block';
                showStatus('Verification code sent! Please check your phone.', 'success');
            } else {
                try {
                    var response = JSON.parse(xhr.responseText);
                    showStatus(response.message || 'Failed to send verification code', 'error');
                } catch (e) {
                    showStatus('Failed to send verification code', 'error');
                }
            }
        }
    };
    xhr.send(JSON.stringify({ phone: phone }));
}

function handleVerification(event) {
    event.preventDefault();
    
    var code = document.getElementById('verification-code').value.trim();
    
    if (!code) {
        return showStatus('Please enter the verification code', 'error');
    }
    
    showStatus('Verifying code...', 'info');
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', window.location.origin + '/api/auth/verify/check', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                showStatus('Phone verified! Creating your account...', 'success');
                completeSignup();
            } else {
                try {
                    var response = JSON.parse(xhr.responseText);
                    showStatus(response.message || 'Invalid verification code', 'error');
                } catch (e) {
                    showStatus('Invalid verification code', 'error');
                }
            }
        }
    };
    xhr.send(JSON.stringify({ 
        phone: pendingUser.phone,
        code: code
    }));
}

function completeSignup() {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', window.location.origin + '/api/auth/signup', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 201 || xhr.status === 200) {
                showStatus('Account created successfully! Redirecting to login...', 'success');
                setTimeout(function() {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                try {
                    var response = JSON.parse(xhr.responseText);
                    showStatus(response.message || 'Failed to create account', 'error');
                } catch (e) {
                    showStatus('Failed to create account', 'error');
                }
            }
        }
    };
    xhr.send(JSON.stringify(pendingUser));
}

function handleResend() {
    showStatus('Resending verification code...', 'info');
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', window.location.origin + '/api/auth/verify/resend', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                showStatus('New verification code sent!', 'success');
            } else {
                try {
                    var response = JSON.parse(xhr.responseText);
                    showStatus(response.message || 'Failed to resend code', 'error');
                } catch (e) {
                    showStatus('Failed to resend verification code', 'error');
                }
            }
        }
    };
    xhr.send(JSON.stringify({ phone: pendingUser.phone }));
}

function showStatus(message, type) {
    var statusEl = document.getElementById('statusMessage');
    if (!statusEl) return;
    
    if (!message) {
        statusEl.style.display = 'none';
        return;
    }
    
    statusEl.textContent = message;
    statusEl.className = 'status-message ' + (type || 'info');
    statusEl.style.display = 'block';
}
