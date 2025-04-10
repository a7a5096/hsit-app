// Daily Sign In functionality with integrated API configuration
// No external config dependency - completely self-contained

// API configuration directly integrated into this file
const API_URL = 'https://hsit-backend.onrender.com';


document.addEventListener('DOMContentLoaded', function() {
    const dailySignInButton = document.getElementById('dailySignInButton');
    const signInText = document.getElementById('signInText');
    
    if (!dailySignInButton || !signInText) return;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    // Check if user has already signed in today
    checkDailySignInStatus();
    
    // Add event listener to sign in button
    dailySignInButton.addEventListener('click', handleDailySignIn);
    
    // Function to check daily sign in status
    async function checkDailySignInStatus() {
        try {
            // Get user data from localStorage
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            // Check if user has already signed in today
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            if (userData.lastSignIn === today) {
                // User has already signed in today
                signInText.textContent = 'Already Signed In';
                dailySignInButton.classList.add('signed-in');
                dailySignInButton.style.pointerEvents = 'none'; // Disable button
            } else {
                // User has not signed in today
                signInText.textContent = 'Daily Sign In';
                dailySignInButton.classList.remove('signed-in');
                dailySignInButton.style.pointerEvents = 'auto'; // Enable button
            }
        } catch (error) {
            console.error('Error checking daily sign in status:', error);
        }
    }
    
    // Function to handle daily sign in
    async function handleDailySignIn(e) {
        e.preventDefault();
        
        try {
            // Show loading state
            signInText.textContent = 'Signing In...';
            dailySignInButton.style.pointerEvents = 'none'; // Disable button
            
            // Get user data
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            // Check if user has already signed in today
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            if (userData.lastSignIn === today) {
                // User has already signed in today
                showMessage('You have already signed in today!', 'info');
                signInText.textContent = 'Already Signed In';
                dailySignInButton.classList.add('signed-in');
                return;
            }
            
            // Simulate API call to record daily sign in
            // In a real implementation, you would send an API request to record the sign in
            // and update the user's balance
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
            
            // Update user data
            userData.lastSignIn = today;
            userData.balances = userData.balances || {};
            userData.balances.ubt = (userData.balances.ubt || 0) + 1; // Add 1 UBT for daily sign in
            
            // Save updated user data
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Update UI
            signInText.textContent = 'Already Signed In';
            dailySignInButton.classList.add('signed-in');
            
            // Show success message
            showMessage('Daily sign in successful! You earned 1 UBT.', 'success');
            
            // Try to update the balance display if it exists
            const balanceElement = document.querySelector('.balance-amount');
            if (balanceElement) {
                balanceElement.textContent = `${userData.balances.ubt.toFixed(2)} UBT`;
            }
            
        } catch (error) {
            console.error('Error handling daily sign in:', error);
            showMessage('Error signing in. Please try again later.', 'error');
            
            // Reset UI
            signInText.textContent = 'Daily Sign In';
            dailySignInButton.style.pointerEvents = 'auto'; // Enable button
        }
    }
    
    // Function to show message
    function showMessage(message, type = 'info') {
        // Check if status message element exists
        let statusElement = document.getElementById('statusMessage');
        
        // If not, create one
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'statusMessage';
            statusElement.className = 'status-message';
            document.body.prepend(statusElement);
        }
        
        // Set message and class
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        // Show message
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
});
