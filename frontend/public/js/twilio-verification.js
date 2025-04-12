// At the top of your file
var skipVerification = true; // Set this to false when you want to re-enable verification

// In your handleSignup function
function handleSignup(event) {
    event.preventDefault();
    
    // Collect form data
    var username = document.getElementById('username').value.trim();
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirm-password').value;
    var privacyPolicy = document.getElementById('privacy-policy').checked;
    
    // Validate inputs (keep basic validation)
    if (!username || !email || !password || password !== confirmPassword || !privacyPolicy) {
        // Handle validation errors as before
        return;
    }
    
    // Store user data
    var userData = {
        username: username,
        email: email,
        password: password
    };
    
    // Add phone if the field exists and verification is not skipped
    var phoneInput = document.getElementById('phone');
    if (!skipVerification && phoneInput) {
        userData.phone = phoneInput.value.trim();
    }
    
    if (skipVerification) {
        // Bypass verification and create user directly
        completeSignup(userData);
    } else {
        // Proceed with normal verification flow
        // Your existing verification code here
    }
}

// Add this function to directly create the user account
function completeSignup(userData) {
    showStatus('Creating your account...', 'info');
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', window.location.origin + '/api/auth/signup', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 201) {
                showStatus('Account created successfully! Redirecting...', 'success');
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
    xhr.send(JSON.stringify(userData));
}
