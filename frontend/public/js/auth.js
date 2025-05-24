/**
 * auth.js
 * 
 * Authentication utilities for the application.
 * Handles login, logout, and auth token management.
 */
console.log("auth.js: Script loaded"); // DEBUG

document.addEventListener("DOMContentLoaded", function() {
    console.log("auth.js: DOMContentLoaded event fired"); // DEBUG

    // Check if API_URL is defined
    if (typeof API_URL === 'undefined') {
        console.error("auth.js: API_URL is not defined! Falling back to default URL.");
        window.API_URL = 'https://hsit-backend.onrender.com'; // Fallback URL
    }

    var loginForm = document.getElementById("loginForm");
    if (loginForm) {
        console.log("auth.js: loginForm found"); // DEBUG
        loginForm.addEventListener("submit", handleLogin);
        console.log("auth.js: Event listener attached to loginForm"); // DEBUG
    } else {
        // Only log error if we are on a page that should have a login form (e.g., index.html)
        const currentPage = window.location.pathname.split("/").pop();
        if (currentPage === "index.html" || currentPage === "") { // Empty string for root path
            console.warn("auth.js: loginForm not found on login page (index.html)!"); // DEBUG
        }
    }

    // Signup form handling
    var signupForm = document.getElementById("signupForm");
    if (signupForm) {
        console.log("auth.js: signupForm found"); // DEBUG
        signupForm.addEventListener("submit", handleSignup);
        console.log("auth.js: Event listener attached to signupForm"); // DEBUG
    } else {
        // This is not an error on the login page
        // console.log("auth.js: signupForm not found (this is okay on login page)"); 
    }
});

/**
 * Handles login form submission
 * @param {Event} event - The form submission event
 */
function handleLogin(event) {
    console.log("auth.js: handleLogin function called"); // DEBUG
    event.preventDefault();
    
    var statusMessage = document.getElementById("statusMessage");
    var emailValue = document.getElementById("email").value.trim(); 
    var passwordValue = document.getElementById("password").value;

    console.log("auth.js: Email value -", emailValue); // DEBUG
    console.log("auth.js: Password value -", passwordValue ? "[PRESENT]" : "[EMPTY]"); // DEBUG
    
    // Clear previous status messages
    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }
    
    // Validate form data
    if (!emailValue || !passwordValue) {
        showStatus("Please enter both email and password", "error");
        console.error("auth.js: Email or password empty"); // DEBUG
        return;
    }
    
    showStatus("Signing in...", "info");
    console.log("auth.js: Attempting to sign in..."); // DEBUG
    
    // Use fetch API instead of XMLHttpRequest for better error handling
    fetch(`${API_URL}/api/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            email: emailValue,
            password: passwordValue
        })
    })
    .then(response => {
        console.log("auth.js: Login API response received, status:", response.status); // DEBUG
        
        // Check if response is ok (status in the range 200-299)
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || `Login failed (Status: ${response.status})`);
            }).catch(jsonError => {
                // If JSON parsing fails, throw a generic error with the status
                throw new Error(`Login failed (Status: ${response.status})`);
            });
        }
        
        return response.json();
    })
    .then(data => {
        console.log("auth.js: Login API success, data:", data); // DEBUG
        
        if (data.token && data.user) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userData", JSON.stringify(data.user));
            
            showStatus("Login successful! Redirecting...", "success");
            setTimeout(function() {
                window.location.href = "dashboard.html";
            }, 1000);
        } else {
            showStatus("Authentication failed: Missing token or user data.", "error");
            console.error("auth.js: Missing token or user data from API"); // DEBUG
        }
    })
    .catch(error => {
        console.error("auth.js: Login error:", error.message); // DEBUG
        
        // Handle network errors specifically
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showStatus("Network error: Could not connect to the server. Please check your internet connection.", "error");
        } else {
            showStatus(error.message || "Login failed. Please try again.", "error");
        }
    });
}

/**
 * Handles signup form submission
 * @param {Event} event - The form submission event
 */
function handleSignup(event) {
    console.log("auth.js: handleSignup function called"); // DEBUG
    
    console.log("auth.js: Attempting to prevent default form submission..."); // DEBUG
    event.preventDefault();
    console.log("auth.js: Default form submission prevented. event.defaultPrevented:", event.defaultPrevented); // DEBUG

    var statusMessage = document.getElementById("statusMessage");
    // Ensure these IDs match your signup.html form
    var usernameValue = document.getElementById("username") ? document.getElementById("username").value.trim() : null;
    var emailValue = document.getElementById("email") ? document.getElementById("email").value.trim() : null;
    var phoneValue = document.getElementById("phone") ? document.getElementById("phone").value.trim() : null;
    var passwordValue = document.getElementById("password") ? document.getElementById("password").value : null;
    var confirmPasswordValue = document.getElementById("confirm-password") ? document.getElementById("confirm-password").value : null;
    var invitationCodeValue = document.getElementById("invitation-code") ? document.getElementById("invitation-code").value.trim() : null;
    var privacyPolicyChecked = document.getElementById("privacy-policy") ? document.getElementById("privacy-policy").checked : false;

    console.log("auth.js: Signup form values collected:", { usernameValue, emailValue, phoneValue, passwordPresent: !!passwordValue, confirmPasswordPresent: !!confirmPasswordValue, invitationCodeValue, privacyPolicyChecked }); // DEBUG

    // Clear previous status messages
    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }

    // Basic Validations
    if (!usernameValue || !emailValue || !phoneValue || !passwordValue || !confirmPasswordValue) {
        showStatus("Please fill in all required fields.", "error");
        console.error("auth.js: Signup validation failed - missing required fields."); // DEBUG
        return;
    }
    if (passwordValue !== confirmPasswordValue) {
        showStatus("Passwords do not match.", "error");
        console.error("auth.js: Signup validation failed - passwords do not match."); // DEBUG
        return;
    }
    if (!privacyPolicyChecked) {
        showStatus("You must agree to the Privacy Policy.", "error");
        console.error("auth.js: Signup validation failed - privacy policy not agreed."); // DEBUG
        return;
    }

    console.log("auth.js: Signup validations passed."); // DEBUG
    showStatus("Creating account...", "info");

    // Use fetch API instead of XMLHttpRequest for better error handling
    fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            username: usernameValue,
            email: emailValue,
            phone: phoneValue,
            password: passwordValue,
            invitationCode: invitationCodeValue || null
        })
    })
    .then(response => {
        console.log("auth.js: Signup API response received, status:", response.status); // DEBUG
        
        // Check if response is ok (status in the range 200-299)
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || `Signup failed (Status: ${response.status})`);
            }).catch(jsonError => {
                // If JSON parsing fails, throw a generic error with the status
                throw new Error(`Signup failed (Status: ${response.status})`);
            });
        }
        
        return response.json();
    })
    .then(data => {
        console.log("auth.js: Signup API success, data:", data); // DEBUG
        
        // Store token and user data immediately if available
        if (data.token && data.user) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userData", JSON.stringify(data.user));
            
            showStatus("Account created successfully! Redirecting to dashboard...", "success");
            setTimeout(function() {
                window.location.href = "dashboard.html";
            }, 2000);
        } else {
            // Fall back to original behavior if token not available
            showStatus(data.message || "Signup successful! Please log in.", "success");
            setTimeout(function() {
                window.location.href = "index.html";
            }, 2000);
        }
    })
    .catch(error => {
        console.error("auth.js: Signup error:", error.message); // DEBUG
        
        // Handle network errors specifically
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showStatus("Network error: Could not connect to the server. Please check your internet connection.", "error");
        } else {
            showStatus(error.message || "Signup failed. Please try again.", "error");
        }
    });
}

/**
 * Displays a status message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (info, success, error, warning)
 */
function showStatus(message, type = "info") {
    var statusMessage = document.getElementById("statusMessage");
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = "block";
    } else {
        console.warn("auth.js: statusMessage element not found, using alert."); // DEBUG
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

/**
 * Checks if the user is authenticated
 * @returns {boolean} Whether the user is authenticated
 */
function isAuthenticated() {
    return !!localStorage.getItem("token");
}

/**
 * Gets the current authentication token
 * @returns {string|null} The authentication token or null if not authenticated
 */
function getAuthToken() {
    return localStorage.getItem("token");
}

/**
 * Logs the user out
 */
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    window.location.href = "index.html";
}

// For protected pages, redirect if not logged in
document.addEventListener("DOMContentLoaded", function() {
    // This second DOMContentLoaded listener is fine, they will both execute.
    console.log("auth.js: Second DOMContentLoaded for protected page check"); // DEBUG
    const protectedPages = ["dashboard.html", "my_team.html", "lucky_wheel.html", "transactions.html", "ubt_exchange.html", "ai_products.html", "asset_center.html", "deposit.html"];
    const currentPage = window.location.pathname.split("/").pop();

    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        console.log("auth.js: Not authenticated on a protected page, redirecting to login."); // DEBUG
        window.location.href = "index.html?require_login=true";
        return;
    }
    
    var logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
        console.log("auth.js: Logout button found, attaching listener"); // DEBUG
        logoutButton.addEventListener("click", function(e) {
            e.preventDefault();
            logout();
        });
    }
});
