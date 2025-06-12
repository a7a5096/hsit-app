document.addEventListener('DOMContentLoaded', function () {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const statusMessage = document.getElementById('statusMessage');

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showMessage('Invalid reset link. Please request a new password reset.', 'error');
        resetPasswordForm.style.display = 'none';
        return;
    }

    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            statusMessage.style.display = 'none';
            statusMessage.className = 'status-message'; // Reset classes

            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitButton = resetPasswordForm.querySelector('button[type="submit"]');

            if (!password || !confirmPassword) {
                showMessage('Please enter and confirm your new password.', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showMessage('Passwords do not match.', 'error');
                return;
            }

            if (password.length < 8) {
                showMessage('Password must be at least 8 characters long.', 'error');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Resetting...';

            try {
                if (typeof API_URL === 'undefined') {
                    throw new Error('API_URL is not defined. Make sure config.js is loaded.');
                }
                
                const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token, password }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showMessage('Password has been reset successfully. You can now login with your new password.', 'success');
                    resetPasswordForm.reset();
                    // Redirect to login page after 3 seconds
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 3000);
                } else {
                    showMessage(data.message || 'Failed to reset password. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Reset password error:', error);
                showMessage('An error occurred. Please try again later.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Reset Password';
            }
        });
    }

    function showMessage(message, type = 'info') {
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`; // Applies 'error' or 'success' class
            statusMessage.style.display = 'block';
        } else {
            console.log(`Status (${type}): ${message}`);
        }
    }
}); 