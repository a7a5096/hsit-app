/**
 * verify.js
 * 
 * Handles phone verification process using Twilio
 */

document.addEventListener("DOMContentLoaded", function() {
    console.log("Verification page loaded");
    
    // Get user data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const phone = urlParams.get('phone');
    
    if (!userId || !phone) {
        showStatus("Missing verification information. Please try signing up again.", "error");
        setTimeout(() => {
            window.location.href = "signup.html";
        }, 3000);
        return;
    }
    
    // Setup verification form handler
    const verifyPhoneForm = document.getElementById("verifyPhoneForm");
    if (verifyPhoneForm) {
        verifyPhoneForm.addEventListener("submit", function(event) {
            event.preventDefault();
            handleVerification(userId, phone);
        });
    }
    
    // Setup resend code handler
    const resendCodeLink = document.getElementById("resend-code");
    if (resendCodeLink) {
        resendCodeLink.addEventListener("click", function(event) {
            event.preventDefault();
            resendVerificationCode(userId, phone);
        });
    }
});

/**
 * Handles verification code submission
 * @param {string} userId - The user ID
 * @param {string} phone - The phone number
 */
function handleVerification(userId, phone) {
    const verificationCodeElement = document.getElementById("verification-code");
    
    if (!verificationCodeElement) {
        showStatus("Verification form elements missing. Please contact support.", "error");
        return;
    }
    
    const verificationCode = verificationCodeElement.value.trim();
    
    if (!verificationCode) {
        showStatus("Please enter the verification code.", "error");
        return;
    }
    
    showStatus("Verifying code...", "info");
    
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://hsit-backend.onrender.com/api/users/verify-phone", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    showStatus(data.message || "Phone verified successfully! Redirecting to login...", "success");
                    setTimeout(function() {
                        window.location.href = "index.html";
                    }, 2000);
                } catch (e) {
                    console.error("Error parsing verification response:", e);
                    showStatus("Verification successful, but there was an issue processing the response. Please try logging in.", "warning");
                    setTimeout(function() {
                        window.location.href = "index.html";
                    }, 2000);
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    showStatus(response.message || `Verification failed (Status: ${xhr.status})`, "error");
                } catch (e) {
                    showStatus(`Verification failed (Status: ${xhr.status})`, "error");
                }
            }
        }
    };
    xhr.send(JSON.stringify({
        userId: userId,
        phone: phone,
        verificationCode: verificationCode
    }));
}

/**
 * Resends verification code
 * @param {string} userId - The user ID
 * @param {string} phone - The phone number
 */
function resendVerificationCode(userId, phone) {
    showStatus("Resending verification code...", "info");
    
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://hsit-backend.onrender.com/api/users/resend-verification", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    showStatus(data.message || "Verification code resent successfully!", "success");
                } catch (e) {
                    console.error("Error parsing resend response:", e);
                    showStatus("Verification code resent successfully!", "success");
                }
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    showStatus(response.message || `Failed to resend code (Status: ${xhr.status})`, "error");
                } catch (e) {
                    showStatus(`Failed to resend code (Status: ${xhr.status})`, "error");
                }
            }
        }
    };
    xhr.send(JSON.stringify({
        userId: userId,
        phone: phone
    }));
}

/**
 * Displays a status message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message (info, success, error, warning)
 */
function showStatus(message, type = "info") {
    const statusMessage = document.getElementById("statusMessage");
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
