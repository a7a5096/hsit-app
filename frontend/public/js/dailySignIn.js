// frontend/public/js/dailySignIn.js
document.addEventListener('DOMContentLoaded', function() {
    const dailySignInButton = document.getElementById('dailySignInButton');
    if (!dailySignInButton) {
        return; 
    }

    console.log("DailySignIn JS: DOMContentLoaded.");

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
            const data = await response.json(); // Await response.json() here
            if (!response.ok) { // Check response.ok after .json() in case of JSON error from server
                throw new Error(data.message || `Status check failed: ${response.status}`);
            }
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
            
            const result = await response.json(); 

            if (!response.ok) { 
                throw new Error(result.message || 'Failed to sign in.');
            }
            
            if (result.success && typeof result.newBalance === 'number') {
                if (typeof balanceManager !== 'undefined') {
                    console.log("DailySignIn JS: Sign-in successful, telling balanceManager to update with new balance:", result.newBalance);
                    balanceManager.updateBalance(result.newBalance); 
                } else {
                    console.error("DailySignIn JS: balanceManager is not defined, cannot update global balance.");
                }
            } else {
                 console.warn("DailySignIn JS: Sign-in response did not have success true or newBalance number.", result);
            }

            alert(result.message || "Sign-in successful!");
            if (signInTextSpan) signInTextSpan.textContent = 'Signed In Today';

        } catch (error) {
            console.error('Daily sign-in error:', error);
            alert(`Error: ${error.message}`);
            checkSignInStatus(); 
        }
    });

    checkSignInStatus();
});
