// frontend/public/js/dailySignIn.js
document.addEventListener('DOMContentLoaded', function() {
    const dailySignInButton = document.getElementById('dailySignInButton');
    if (!dailySignInButton) {
        return; // Button not present on this page
    }

    console.log("DailySignIn JS: DOMContentLoaded.");

    // API_URL should be globally defined by config.js by the time this script runs
    const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';
    const signInTextSpan = dailySignInButton.querySelector('span');

    const checkSignInStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            dailySignInButton.disabled = true;
            if (signInTextSpan) signInTextSpan.textContent = 'Log in to Sign In';
            return;
        }
        try {
            const response = await fetch(`${effectiveApiUrl}/api/daily-signin/status`, {
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) {
                throw new Error(`Status check failed: ${response.status}`);
            }
            const data = await response.json();
            if (data.hasSignedInToday) {
                dailySignInButton.disabled = true;
                if (signInTextSpan) signInTextSpan.textContent = 'Signed In Today';
            } else {
                dailySignInButton.disabled = false;
                if (signInTextSpan) signInTextSpan.textContent = 'Daily Sign In';
            }
        } catch (error) {
            console.error('Error checking sign-in status:', error);
            dailySignInButton.disabled = true; 
            if (signInTextSpan) signInTextSpan.textContent = 'Sign-in Error';
        }
    };

    dailySignInButton.addEventListener('click', async function() {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            alert('You must be logged in to use the daily sign-in feature.');
            return;
        }
        this.disabled = true;

        try {
            const response = await fetch(`${effectiveApiUrl}/api/daily-signin/signin`, {
                method: 'POST',
                headers: { 'x-auth-token': currentToken }
            });
            
            const result = await response.json(); // Await response first

            if (!response.ok) { // Check response status after getting JSON
                throw new Error(result.message || 'Failed to sign in.');
            }
            
            // --- THIS IS THE CRUCIAL PART ---
            if (result.success && typeof result.newBalance === 'number' && typeof balanceManager !== 'undefined') {
                console.log("DailySignIn JS: Sign-in successful, telling balanceManager to update.");
                // Use balanceManager to update the balance globally.
                // This will dispatch the 'balanceUpdated' event that other pages listen for.
                balanceManager.updateBalance(result.newBalance); 
            } else if (typeof balanceManager === 'undefined') {
                console.error("DailySignIn JS: balanceManager is not defined, cannot update global balance.");
            }
            // --- END CRUCIAL PART ---

            alert(result.message || "Sign-in successful!");
            if (signInTextSpan) signInTextSpan.textContent = 'Signed In Today';

        } catch (error) {
            console.error('Daily sign-in error:', error);
            alert(`Error: ${error.message}`);
            checkSignInStatus(); 
        }
    });

    // Initial check when the page loads
    checkSignInStatus();
});
