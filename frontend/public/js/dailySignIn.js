// frontend/public/js/dailySignIn.js
document.addEventListener('DOMContentLoaded', function() {
    const dailySignInButton = document.getElementById('dailySignInButton');
    if (!dailySignInButton) {
        return; // Button not present on this page
    }

    console.log("DailySignIn JS: DOMContentLoaded.");

    const token = localStorage.getItem('token');
    const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';

    const signInTextSpan = dailySignInButton.querySelector('span'); // Get the span for text update

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
            const data = await response.json();
            if (response.ok && data.hasSignedInToday) {
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
        const currentToken = localStorage.getItem('token'); // Get fresh token
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
            const result = await response.json();

            if (response.ok && result.success) {
                if (typeof result.newBalance === 'number' && typeof balanceManager !== 'undefined') {
                    // Use the balanceManager to update the balance globally
                    console.log("DailySignIn JS: Sign-in successful, updating balance via balanceManager.");
                    balanceManager.updateBalance(result.newBalance);
                } else if (typeof balanceManager === 'undefined') {
                     console.error("DailySignIn JS: balanceManager is not defined, cannot update global balance.");
                }
                alert(result.message || "Sign-in successful!"); // Or use a less intrusive notification
                if (signInTextSpan) signInTextSpan.textContent = 'Signed In Today';
            } else {
                throw new Error(result.message || 'Failed to sign in. You may have already signed in today.');
            }
        } catch (error) {
            console.error('Daily sign-in error:', error);
            alert(`Error: ${error.message}`);
            // Re-check status to determine if button should be re-enabled
             checkSignInStatus(); 
        }
    });

    // Initial check when the page loads
    if (token) { // Only check status if a token exists (user might be logged in)
        checkSignInStatus();
    } else {
        dailySignInButton.disabled = true;
        if (signInTextSpan) signInTextSpan.textContent = 'Log in to Sign In';
    }
});
