// frontend/public/js/dailySignIn.js
document.addEventListener('DOMContentLoaded', function() {
    const dailySignInButton = document.getElementById('dailySignInButton');
    if (!dailySignInButton) {
        return; // Button not present on this page
    }

    console.log("DailySignIn JS: DOMContentLoaded.");

    const token = localStorage.getItem('token');
    // API_URL should be globally defined by config.js by the time this script runs
    const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com'; 
                                                        // Fallback, but config.js loading first is preferred

    if (typeof API_URL === 'undefined') {
        console.warn("DailySignIn JS: API_URL was not defined from config.js, using fallback.");
    }


    const signInTextSpan = dailySignInButton.querySelector('span');

    const checkSignInStatus = async () => {
        if (!token) {
            dailySignInButton.disabled = true;
            if (signInTextSpan) signInTextSpan.textContent = 'Log in to Sign In';
            return;
        }
        try {
            const response = await fetch(`${effectiveApiUrl}/api/daily-signin/status`, {
                headers: { 'x-auth-token': token }
            });

            if (!response.ok) { // Check if response is not OK (e.g., 404, 500)
                const errorText = await response.text(); // Get error as text
                throw new Error(`Status check failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json(); // Now it's safer to parse as JSON
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

            if (!response.ok) { // Check if response is not OK
                const errorText = await response.text(); // Get error as text to avoid JSON parse error
                throw new Error( `Sign-in failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json(); // Now parse as JSON

            if (result.success) {
                if (typeof result.newBalance === 'number' && typeof balanceManager !== 'undefined') {
                    console.log("DailySignIn JS: Sign-in successful, updating balance via balanceManager.");
                    balanceManager.updateBalance(result.newBalance);
                } else if (typeof balanceManager === 'undefined') {
                     console.error("DailySignIn JS: balanceManager is not defined, cannot update global balance.");
                }
                alert(result.message || "Sign-in successful!");
                if (signInTextSpan) signInTextSpan.textContent = 'Signed In Today';
            } else {
                // This else might not be reached if !response.ok throws first
                throw new Error(result.message || 'Failed to sign in. You may have already signed in today.');
            }
        } catch (error) { // This catch block is around line 69 from your log
            console.error('Daily sign-in error:', error); // Logs the actual error object
            alert(`Error: ${error.message}`); // Shows the error message (which could be the SyntaxError)
            // After an error, re-check status to correctly set button state
            checkSignInStatus(); 
        }
    });

    if (token) {
        checkSignInStatus();
    } else {
        dailySignInButton.disabled = true;
        if (signInTextSpan) signInTextSpan.textContent = 'Log in to Sign In';
    }
});
