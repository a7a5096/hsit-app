// frontend/public/js/auth.js
console.log("auth.js: Script loaded at", new Date().toISOString()); 

document.addEventListener("DOMContentLoaded", function() {
    console.log("auth.js: DOMContentLoaded event fired"); 

    // Check if API_URL is defined
    if (typeof API_URL === 'undefined') {
        console.error("auth.js: API_URL is not defined! Falling back to default URL.");
        window.API_URL = 'https://hsit-backend.onrender.com';
    } else {
        console.log("auth.js: API_URL is defined as:", API_URL);
    }

    var loginForm = document.getElementById("loginForm");
    console.log("auth.js: Looking for loginForm, found:", loginForm);
    
    if (loginForm) {
        console.log("auth.js: loginForm found, attaching submit handler"); 
        
        // Remove any existing listeners first (in case of double-load)
        loginForm.removeEventListener("submit", handleLogin);
        loginForm.addEventListener("submit", handleLogin);
        
        // Also add click handler to the submit button as backup
        var submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            console.log("auth.js: Submit button found, adding click handler as backup");
            submitBtn.addEventListener("click", function(e) {
                console.log("auth.js: Submit button clicked");
            });
        }
        
        console.log("auth.js: Event listener attached to loginForm"); 
    } else {
        const currentPage = window.location.pathname.split("/").pop();
        console.log("auth.js: Current page is:", currentPage);
        if (currentPage === "index.html" || currentPage === "") { 
            console.error("auth.js: CRITICAL - loginForm not found on login page!"); 
        }
    }

    var signupForm = document.getElementById("signupForm");
    if (signupForm) {
        console.log("auth.js: signupForm found"); 
        signupForm.addEventListener("submit", handleSignup);
        console.log("auth.js: Event listener attached to signupForm"); 
    }
});

function handleLogin(event) {
    console.log("auth.js: handleLogin function called at", new Date().toISOString()); 
    
    // Prevent default form submission
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        console.log("auth.js: Default form submission prevented");
    }

    var statusMessage = document.getElementById("statusMessage");
    var emailEl = document.getElementById("email");
    var passwordEl = document.getElementById("password");
    
    console.log("auth.js: Email element:", emailEl);
    console.log("auth.js: Password element:", passwordEl);
    
    if (!emailEl || !passwordEl) {
        console.error("auth.js: Email or password input not found!");
        alert("Error: Form inputs not found. Please refresh the page.");
        return;
    }
    
    var emailValue = emailEl.value.trim();
    var passwordValue = passwordEl.value;
    
    console.log("auth.js: Email value:", emailValue);
    console.log("auth.js: Password provided:", passwordValue ? "yes" : "no");

    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }

    if (!emailValue || !passwordValue) {
        showStatus("Please enter both email and password", "error");
        return;
    }

    showStatus("Signing in...", "info");
    console.log("auth.js: Making fetch request to:", `${API_URL}/api/auth`);

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
        console.log("auth.js: Received response, status:", response.status);
        if (!response.ok) {
            return response.json().then(errorData => {
                console.error("auth.js: Login failed with error data:", errorData);
                throw new Error(errorData.message || `Login failed (Status: ${response.status})`);
            }).catch((parseError) => {
                console.error("auth.js: Could not parse error response:", parseError);
                throw new Error(`Login failed (Status: ${response.status}, unable to parse error)`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("auth.js: Login response data:", data);
        if (data.token && data.user) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("userData", JSON.stringify(data.user));

            // *** Dispatch the loginSuccess event for balanceManager ***
            document.dispatchEvent(new CustomEvent('loginSuccess'));
            console.log("auth.js: Dispatched 'loginSuccess' event after successful login.");

            showStatus("Login successful! Redirecting...", "success");
            setTimeout(function() {
                window.location.href = "dashboard.html";
            }, 1000);
        } else {
            throw new Error(data.message || "Authentication failed: Missing token or user data.");
        }
    })
    .catch(error => {
        console.error("auth.js: Login error:", error); 
        console.error("auth.js: Error name:", error.name);
        console.error("auth.js: Error message:", error.message);
        
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showStatus("Network error: Could not connect. Please check your internet.", "error");
        } else {
            showStatus(error.message || "Login failed. Please try again.", "error");
        }
    });
}

// Global error handler to catch any uncaught errors
window.addEventListener('error', function(event) {
    console.error("auth.js: Global error caught:", event.error);
});

function handleSignup(event) {
    console.log("auth.js: handleSignup function called"); 
    event.preventDefault();

    var statusMessage = document.getElementById("statusMessage");
    var usernameValue = document.getElementById("username")?.value.trim();
    var emailValue = document.getElementById("email")?.value.trim();
    var phoneValue = document.getElementById("phone")?.value.trim(); // Ensure your HTML uses id="phone"
    var passwordValue = document.getElementById("password")?.value;
    var confirmPasswordValue = document.getElementById("confirm-password")?.value;
    var invitationCodeValue = document.getElementById("invitation-code")?.value.trim();
    var privacyPolicyChecked = document.getElementById("privacy-policy")?.checked;

    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }

    if (!usernameValue || !emailValue || !phoneValue || !passwordValue || !confirmPasswordValue) {
        showStatus("Please fill in all required fields.", "error"); return;
    }
    if (passwordValue !== confirmPasswordValue) {
        showStatus("Passwords do not match.", "error"); return;
    }
    if (!privacyPolicyChecked) {
        showStatus("You must agree to the Privacy Policy.", "error"); return;
    }

    showStatus("Creating account...", "info");

    fetch(`${API_URL}/api/auth/register`, { // Assuming /api/auth/register for signup
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            username: usernameValue,
            email: emailValue,
            phoneNumber: phoneValue, // Ensure backend expects phoneNumber
            password: passwordValue,
            invitationCode: invitationCodeValue || null
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || `Signup failed (Status: ${response.status})`);
            }).catch(() => {
                throw new Error(`Signup failed (Status: ${response.status}, unable to parse error)`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.token && data.user) { // If signup also logs in user and returns token
            localStorage.setItem("token", data.token);
            localStorage.setItem("userData", JSON.stringify(data.user));

            // *** Dispatch the loginSuccess event for balanceManager ***
            document.dispatchEvent(new CustomEvent('loginSuccess'));
            console.log("auth.js: Dispatched 'loginSuccess' event after successful signup.");

            showStatus("Account created! Redirecting...", "success");
            setTimeout(function() {
                window.location.href = "dashboard.html";
            }, 2000);
        } else {
            showStatus(data.message || "Signup successful! Please log in.", "success");
            setTimeout(function() {
                window.location.href = "index.html"; // Redirect to login
            }, 2000);
        }
    })
    .catch(error => {
        console.error("auth.js: Signup error:", error.message);
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showStatus("Network error. Please check your internet connection.", "error");
        } else {
            showStatus(error.message || "Signup failed. Please try again.", "error");
        }
    });
}

function showStatus(message, type = "info") {
    var statusMessage = document.getElementById("statusMessage");
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`; // Assumes CSS for .info, .success, .error
        statusMessage.style.display = "block";
    } else {
        console.warn("auth.js: statusMessage element not found, using alert.");
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

function isAuthenticated() {
    return !!localStorage.getItem("token");
}

function getAuthToken() {
    return localStorage.getItem("token");
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    localStorage.removeItem("ubtBalance"); // Clear cached balance on logout
    // Dispatch an event so other components (like balanceManager) can react to logout
    document.dispatchEvent(new CustomEvent('logoutSuccess')); 
    console.log("auth.js: User logged out, dispatched 'logoutSuccess' event.");
    window.location.href = "index.html";
}

// For protected pages
document.addEventListener("DOMContentLoaded", function() {
    console.log("auth.js: Second DOMContentLoaded for protected page check"); 
    const protectedPages = ["dashboard.html", "my_team.html", "spinning_wheel_game.html", "transactions.html", "ubt_exchange.html", "ai_products.html", "asset_center.html", "deposit.html"];
    // Corrected: Get current page filename
    const pathArray = window.location.pathname.split('/');
    const currentPage = pathArray[pathArray.length - 1] || "index.html"; // Default to index.html if path ends with /

    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        console.log(`auth.js: Not authenticated on protected page (${currentPage}), redirecting to login.`);
        window.location.href = "index.html?require_login=true";
        return; // Stop further execution if redirecting
    }

    // Attach logout to any button with class .btn-logout
    document.querySelectorAll('.btn-logout').forEach(button => {
         console.log("auth.js: Logout button with class .btn-logout found, attaching listener");
         button.addEventListener("click", function(e) {
             e.preventDefault();
             logout();
         });
    });
});
