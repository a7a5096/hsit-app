document.addEventListener('DOMContentLoaded', function() {
    const dailySignInButton = document.getElementById('dailySignInButton');
    if (!dailySignInButton) {
        // console.log("Daily sign-in button not found on this page.");
        return;
    }

    const token = localStorage.getItem('token');
    // Ensure API_URL is available globally (e.g. from config.js)
    const effectiveApiUrl = typeof API_URL !== 'undefined' ? API_URL : 'https://hsit-backend.onrender.com';

    const checkSignInStatus = async () => {
        if (!token) {
            dailySignInButton.disabled = true;
            dailySignInButton.querySelector('span').textContent = 'Log in to Sign In';
            return;
        }
        try {
            const response = await fetch(`${effectiveApiUrl}/api/daily-signin/status`, {
                headers: { 'x-auth-token': token }
            });
            const data = await response.json();
            if (response.ok && data.hasSignedInToday) {
                dailySignInButton.disabled = true;
                dailySignInButton.querySelector('span').textContent = 'Signed In Today';
            } else {
                dailySignInButton.disabled = false;
                dailySignInButton.querySelector('span').textContent = 'Daily Sign In';
            }
        } catch (error) {
            console.error('Error checking sign-in status:', error);
            dailySignInButton.disabled = true; 
            dailySignInButton.querySelector('span').textContent = 'Sign-in Error';
        }
    };

    dailySignInButton.addEventListener('click', async function() {
        if (!token) {
            alert('You must be logged in to use the daily sign-in feature.');
            return;
        }
        this.disabled = true;

        try {
            const response = await fetch(`${effectiveApiUrl}/api/daily-signin/signin`, {
                method: 'POST',
                headers: { 'x-auth-token': token }
            });
            const result = await response.json();

            if (response.ok && result.success) {
                if (typeof result.newBalance === 'number') {
                    // Use the balanceManager to update the balance globally
                    balanceManager.updateBalance(result.newBalance);
                }
                alert(result.message || "Sign-in successful!");
                dailySignInButton.querySelector('span').textContent = 'Signed In Today';
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

    checkSignInStatus();
});
