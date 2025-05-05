/**
 * auth.js
 * 
 * Authentication utilities for the application.
 * Handles login (using email), signup, logout, and auth token management.
 */

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded and parsed"); // Keep one initial log for confirmation

    // Setup Login Form Handler if on login page
    var loginForm = document.getElementById("loginForm");
    if (loginForm) {
        console.log("Login form found, attaching listener.");
        loginForm.addEventListener("submit", handleLogin);
    }

    // Setup Signup Form Handler if on signup page
    var signupForm = document.getElementById("signupForm");
    if (signupForm) {
        console.log("Signup form found, attaching listener.");
        signupForm.addEventListener("submit", handleSignup);
    }
    
    // Setup logout button if it exists on any page (e.g., dashboard)
    // Moved from the bottom to ensure it's setup regardless of login/signup form presence
    var logoutButton = document.getElementById("logout-button"); 
    if (logoutButton) {
        logoutButton.addEventListener("click", function(e) {
            e.preventDefault();
            logout();
        });
    }

    // Protected page check (can remain here)
    const protectedPages = ["dashboard.html", "my_team.html", "lucky_wheel.html", "transactions.html", "ubt_exchange.html", "ai_products.html", "asset_center.html", "deposit.html", "company_info.html"]; // Added company_info.html
    const currentPage = window.location.pathname.split("/").pop();

    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        console.log("Not authenticated, redirecting to login.");
        window.location.href = "index.html?require_login=true";
        // No return needed here as the redirect handles it
    }
});

/**
 * Handles login form submission
 * @param {Event} event - The form submission event
 */
function handleLogin(event) {
    console.log("handleLogin function called."); 
    event.preventDefault();
    
    var statusMessage = document.getElementById("statusMessage");
    var emailElement = document.getElementById("email"); // Use email ID
    var passwordElement = document.getElementById("password");

    // Ensure elements exist before accessing value
    if (!emailElement || !passwordElement) {
        console.error("Login form elements (email or password) not found!"); 
        showStatus("Login form elements missing. Please contact support.", "error");
        return;
    }

    var email = emailElement.value.trim(); 
    var password = passwordElement.value;
    
    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }
    
    if (!email || !password) {
        showStatus("Please enter both email and password", "error");
        return;
    }
    
    showStatus("Signing in...", "info");
    
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://hsit-backend.onrender.com/api/auth", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    if (data.token && data.user) {
                        localStorage.setItem("token", data.token);
                        localStorage.setItem("userData", JSON.stringify(data.user));
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
    xhr.send(JSON.stringify({
        email: email, // Send email
        password: password
    }));
}

/**
 * Handles signup form submission
 * @param {Event} event - The form submission event
 */
function handleSignup(event) {
    console.log("handleSignup function called.");
    event.preventDefault();

    var statusMessage = document.getElementById("statusMessage");
    // Get elements specific to signup form
    var usernameElement = document.getElementById("username");
    var emailElement = document.getElementById("email");
    var phoneElement = document.getElementById("phone");
    var passwordElement = document.getElementById("password");
    var confirmPasswordElement = document.getElementById("confirm-password");
    var invitationCodeElement = document.getElementById("invitation-code");
    var privacyPolicyElement = document.getElementById("privacy-policy");

    // Ensure all signup elements exist before accessing value
    if (!usernameElement || !emailElement || !phoneElement || !passwordElement || !confirmPasswordElement || !invitationCodeElement || !privacyPolicyElement) {
        console.error("Signup form elements missing!");
        showStatus("Signup form elements missing. Please contact support.", "error");
        return;
    }

    var username = usernameElement.value.trim();
    var email = emailElement.value.trim();
    var phone = phoneElement.value.trim();
    var password = passwordElement.value;
    var confirmPassword = confirmPasswordElement.value;
    var invitationCode = invitationCodeElement.value.trim();
    var privacyPolicy = privacyPolicyElement.checked;

    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }

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

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://hsit-backend.onrender.com/api/users/register", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 201 || xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    showStatus(data.message || "Signup successful! Please log in.", "success");
                    setTimeout(function() {
                        window.location.href = "index.html";
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
        invitationCode: invitationCode || null
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
    } else {
        console.error("Status message element not found!");
        // Fallback if status message element doesn't exist
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

// Note: The DOMContentLoaded listener runs once. The protected page check
// and logout button setup are now inside it, ensuring they run after the DOM is ready.

