/**
 * auth.js
 * 
 * Authentication utilities for the application.
 * Handles login (using username), logout, and auth token management.
 */
// Login form handling
document.addEventListener("DOMContentLoaded", function() {
    var loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    // Signup form handling (assuming signup also uses auth.js or similar logic)
    var signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", handleSignup);
    }
});

/**
 * Handles login form submission
 * @param {Event} event - The form submission event
 */
function handleLogin(event) {
    event.preventDefault();
    
    var statusMessage = document.getElementById("statusMessage");
    // Changed from email to username
    var username = document.getElementById("username").value.trim(); 
    var password = document.getElementById("password").value;
    
    // Clear previous status messages
    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }
    
    // Validate form data
    if (!username || !password) {
        showStatus("Please enter both username and password", "error");
        return;
    }
    
    showStatus("Signing in...", "info");
    
    // Call login API using XMLHttpRequest
    var xhr = new XMLHttpRequest();
    // Ensure the backend endpoint /api/auth accepts username
    xhr.open("POST", "https://hsit-backend.onrender.com/api/auth", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    // Save auth token and user data
                    if (data.token && data.user) {
                        localStorage.setItem("token", data.token); // Use "token" consistently
                        localStorage.setItem("userData", JSON.stringify(data.user)); // Store user data
                        
                        // Redirect to dashboard
                        showStatus("Login successful! Redirecting...", "success");
                        setTimeout(function() {
                            window.location.href = "dashboard.html";
                        }, 1000);
                    } else {
                        showStatus("Authentication failed: Missing token or user data.", "error");
                    }
                } catch (e) {
                    console.error("Error parsing login response:", e);
                    showStatus("Error processing server response", "error");
                }
            } else {
                try {
                    var response = JSON.parse(xhr.responseText);
                    showStatus(response.message || `Login failed (Status: ${xhr.status})`, "error");
                } catch (e) {
                    showStatus(`Login failed (Status: ${xhr.status})`, "error");
                }
            }
        }
    };
    // Send username instead of email
    xhr.send(JSON.stringify({
        username: username,
        password: password
    }));
}

/**
 * Handles signup form submission
 * @param {Event} event - The form submission event
 */
function handleSignup(event) {
    event.preventDefault();

    var statusMessage = document.getElementById("statusMessage");
    var username = document.getElementById("username").value.trim();
    var email = document.getElementById("email").value.trim();
    var phone = document.getElementById("phone").value.trim();
    var password = document.getElementById("password").value;
    var confirmPassword = document.getElementById("confirm-password").value;
    var invitationCode = document.getElementById("invitation-code").value.trim();
    var privacyPolicy = document.getElementById("privacy-policy").checked;

    // Clear previous status messages
    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }

    // Basic Validations
    if (!username || !email || !phone || !password || !confirmPassword) {
        showStatus("Please fill in all required fields.", "error");
        return;
    }
    if (password !== confirmPassword) {
        showStatus("Passwords do not match.", "error");
        return;
    }
    if (!privacyPolicy) {
        showStatus("You must agree to the Privacy Policy.", "error");
        return;
    }

    showStatus("Creating account...", "info");

    // Call signup API
    var xhr = new XMLHttpRequest();
    // Ensure the backend endpoint /api/users/register exists and handles these fields
    xhr.open("POST", "https://hsit-backend.onrender.com/api/users/register", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 201 || xhr.status === 200) { // 201 Created or 200 OK
                try {
                    var data = JSON.parse(xhr.responseText);
                    showStatus(data.message || "Signup successful! Please log in.", "success");
                    // Optionally log the user in directly or redirect to login
                    setTimeout(function() {
                        window.location.href = "index.html"; // Redirect to login page
                    }, 2000);
                } catch (e) {
                    console.error("Error parsing signup response:", e);
                    showStatus("Account created, but there was an issue processing the response. Please try logging in.", "warning");
                     setTimeout(function() {
                        window.location.href = "index.html";
                    }, 2000);
                }
            } else {
                try {
                    var response = JSON.parse(xhr.responseText);
                    showStatus(response.message || `Signup failed (Status: ${xhr.status})`, "error");
                } catch (e) {
                    showStatus(`Signup failed (Status: ${xhr.status})`, "error");
                }
            }
        }
    };
    xhr.send(JSON.stringify({
        username: username,
        email: email,
        phone: phone,
        password: password,
        invitationCode: invitationCode || null // Send null if empty
    }));
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
        // Auto-hide after some time, except for persistent errors?
        // setTimeout(() => { statusMessage.style.display = 'none'; }, 5000);
    } else {
        // Fallback if status message element doesn't exist
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

/**
 * Checks if the user is authenticated
 * @returns {boolean} Whether the user is authenticated
 */
function isAuthenticated() {
    return !!localStorage.getItem("token"); // Use "token" consistently
}

/**
 * Gets the current authentication token
 * @returns {string|null} The authentication token or null if not authenticated
 */
function getAuthToken() {
    return localStorage.getItem("token"); // Use "token" consistently
}

/**
 * Logs the user out
 */
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userData"); // Also clear user data
    window.location.href = "index.html";
}

// For protected pages, redirect if not logged in
document.addEventListener("DOMContentLoaded", function() {
    // Check if this is a protected page (e.g., dashboard, my_team)
    // A more robust check might involve specific page URLs or a meta tag
    const protectedPages = ["dashboard.html", "my_team.html", "lucky_wheel.html", "transactions.html", "ubt_exchange.html", "ai_products.html", "asset_center.html", "deposit.html"];
    const currentPage = window.location.pathname.split("/").pop();

    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        console.log("Not authenticated, redirecting to login.");
        window.location.href = "index.html?require_login=true";
        return; // Stop further execution on this page
    }
    
    // Setup logout button if it exists on the page
    var logoutButton = document.getElementById("logout-button"); // Assuming a common ID for logout buttons
    if (logoutButton) {
        logoutButton.addEventListener("click", function(e) {
            e.preventDefault();
            logout();
        });
    }
});

