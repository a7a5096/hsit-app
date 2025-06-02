document.addEventListener('DOMContentLoaded', function () {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const statusMessage = document.getElementById('statusMessage');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            statusMessage.style.display = 'none';
            statusMessage.className = 'status-message'; // Reset classes

            const email = document.getElementById('email').value;
            const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');

            if (!email) {
                showMessage('Please enter your email address.', 'error');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';

            try {
                if (typeof API_URL === 'undefined') {
                    throw new Error('API_URL is not defined. Make sure config.js is loaded.');
                }
                
                // This endpoint will be created in the backend in the next steps
                const response = await fetch(`${API_URL}/api/auth/request-password-reset`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showMessage(data.message || 'If an account with that email exists, a password reset link has been sent.', 'success');
                    forgotPasswordForm.reset(); // Clear the form
                } else {
                    showMessage(data.message || 'Failed to send reset link. Please try again.', 'error');
                }
            } catch (error) {
                console.error('Forgot password error:', error);
                showMessage('An error occurred. Please try again later.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Send Reset Link';
            }
        });
    }

    function showMessage(message, type = 'info') {
        if (statusMessage) {
            statusMessage.textContent = message;
            statusMessage.className = `status-message ${type}`; // Applies 'error' or 'success' class
            statusMessage.style.display = 'block';

            // Optional: auto-hide message after some time
            // setTimeout(() => {
            //     statusMessage.style.display = 'none';
            // }, 7000);
        } else {
            console.log(`Status (${type}): ${message}`);
        }
    }
});
