// frontend/public/js/auth.js
console.log("auth.js: Script loaded"); 

document.addEventListener("DOMContentLoaded", function() {
    console.log("auth.js: DOMContentLoaded event fired"); 

    if (typeof API_URL === 'undefined') {
        console.error("auth.js: API_URL is not defined! Falling back to default URL.");
        window.API_URL = 'https://hsit-backend.onrender.com'; // Fallback URL
    }

    var loginForm = document.getElementById("loginForm");
    if (loginForm) {
        console.log("auth.js: loginForm found"); 
        loginForm.addEventListener("submit", handleLogin);
        console.log("auth.js: Event listener attached to loginForm"); 
    } else {
        const currentPage = window.location.pathname.split("/").pop();
        if (currentPage === "index.html" || currentPage === "") { 
            console.warn("auth.js: loginForm not found on login page (index.html)!"); 
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
    console.log("auth.js: handleLogin function called"); 
    event.preventDefault();

    var statusMessage = document.getElementById("statusMessage");
    var emailValue = document.getElementById("email").value.trim();
    var passwordValue = document.getElementById("password").value;

    if (statusMessage) {
        statusMessage.textContent = "";
        statusMessage.style.display = "none";
    }

    if (!emailValue || !passwordValue) {
        showStatus("Please enter both email and password", "error");
        return;
    }

    showStatus("Signing in...", "info");

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
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.message || `Login failed (Status: ${response.status})`);
            }).catch(() => { // Catch if response.json() itself fails
                throw new Error(`Login failed (Status: ${response.status}, unable to parse error)`);
            });
        }
        return response.json();
    })
    .then(data => {
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
        console.error("auth.js: Login error:", error.message); 
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showStatus("Network error: Could not connect. Please check your internet.", "error");
        } else {
            showStatus(error.message || "Login failed. Please try again.", "error");
        }
    });
}

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
