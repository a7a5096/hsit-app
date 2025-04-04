// Modified auth.js file with CORS-enabled API configuration
// No external config dependency - completely self-contained

// API configuration directly integrated into this file
const API_URL = 'https://huqwwv8anj.execute-api.us-east-1.amazonaws.com/prod';

// Signup function with SMS verification
async function signup(username, email, password, phoneNumber = null, invitationCode = null) {
  try {
    // Check if privacy policy is accepted
    const privacyPolicyCheckbox = document.getElementById('privacy-policy');
    if (!privacyPolicyCheckbox || !privacyPolicyCheckbox.checked) {
      throw new Error('You must accept the Privacy Policy to continue');
    }

    // Validate phone number (required for SMS verification)
    if (!phoneNumber) {
      throw new Error('Phone number is required for account verification');
    }

    // Prepare user data with verification method
    const userData = {
      username,
      email,
      password,
      phoneNumber,
      verificationMethod: 'phone',
      invitationCode: invitationCode || username // Use username as default referral code if none provided
    };
    
    showMessage('Creating your account...', 'info');
    
    // Use the integrated API URL with CORS-enabled fetch options
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.msg || 'Signup failed');
    }
    
    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('verificationMethod', 'phone');
    localStorage.setItem('username', username);
    
    // Show verification instructions
    showMessage('Account created! Please check your phone for a verification code.', 'success');
    
    // Show phone verification modal
    await verifyPhoneNumber();
    
    // Redirect to dashboard
    window.location.href = '/dashboard.html';
  } catch (error) {
    console.error('Signup error:', error);
    showMessage(error.message, 'error');
  }
}

// Phone verification function
async function verifyPhoneNumber() {
  try {
    const verificationCode = await collectVerificationCode('phone');
    if (!verificationCode) {
      throw new Error('Verification code is required');
    }
    
    // Use the integrated API URL with CORS-enabled fetch options
    const response = await fetch(`${API_URL}/api/phone-verification/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': localStorage.getItem('token'),
        'Origin': window.location.origin
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({ verificationCode })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.msg || 'Phone verification failed');
    }
    
    showMessage('Phone verified successfully!', 'success');
    return true;
  } catch (error) {
    console.error('Phone verification error:', error);
    showMessage(error.message, 'error');
    return false;
  }
}

// Email verification function
async function verifyEmail() {
  try {
    const verificationCode = await collectVerificationCode('email');
    if (!verificationCode) {
      throw new Error('Verification code is required');
    }
    
    // Use the integrated API URL with CORS-enabled fetch options
    const response = await fetch(`${API_URL}/api/email-verification/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': localStorage.getItem('token'),
        'Origin': window.location.origin
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({ verificationCode })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.msg || 'Email verification failed');
    }
    
    showMessage('Email verified successfully!', 'success');
    return true;
  } catch (error) {
    console.error('Email verification error:', error);
    showMessage(error.message, 'error');
    return false;
  }
}

// Collect verification code via modal
function collectVerificationCode(method = 'email') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Verify Your ${method === 'email' ? 'Email' : 'Phone'}</h2>
        <p>Please enter the verification code sent to your ${method === 'email' ? 'email address' : 'phone number'}.</p>
        <input type="text" id="verification-code" placeholder="Enter verification code" />
        <div class="button-group">
          <button id="verify-btn">Verify</button>
          <button id="resend-btn">Resend Code</button>
          <button id="cancel-btn">Cancel</button>
        </div>
        <p class="privacy-note">By continuing, you agree to our <a href="https://www.lawdepot.ca/contracts/website-privacy-policy/preview.aspx?webuser_data_id=196003349&loc=CA" target="_blank">Privacy Policy</a>.</p>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const verifyBtn = document.getElementById('verify-btn');
    const resendBtn = document.getElementById('resend-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const codeInput = document.getElementById('verification-code');
    
    verifyBtn.addEventListener('click', () => {
      const code = codeInput.value.trim();
      if (code) {
        document.body.removeChild(modal);
        resolve(code);
      } else {
        showMessage('Please enter a verification code', 'error');
      }
    });
    
    resendBtn.addEventListener('click', async () => {
      try {
        const endpoint = method === 'email' 
          ? '/api/email-verification/resend-email-verification'
          : '/api/phone-verification/resend';
          
        // Use the integrated API URL with CORS-enabled fetch options
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': localStorage.getItem('token'),
            'Origin': window.location.origin
          },
          credentials: 'include',
          mode: 'cors'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.msg || `Failed to resend ${method} verification code`);
        }
        
        showMessage(`Verification code resent to your ${method}`, 'success');
      } catch (error) {
        console.error('Resend verification error:', error);
        showMessage(error.message, 'error');
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(null);
    });
  });
}

// Login function
async function login(email, password) {
  try {
    showMessage('Logging in...', 'info');
    
    // Use the integrated API URL with CORS-enabled fetch options
    const response = await fetch(`${API_URL}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.msg || 'Login failed');
    }
    
    // Store token and user data
    localStorage.setItem('token', data.token);
    localStorage.setItem('userData', JSON.stringify(data.user));
    localStorage.setItem('username', data.user.username);
    
    // Check if verification is needed
    if (data.user.isVerified) {
      showMessage('Login successful!', 'success');
      window.location.href = '/dashboard.html';
    } else {
      showMessage('Please verify your account to continue', 'warning');
      
      // Determine verification method
      if (data.user.verificationMethod === 'phone') {
        await verifyPhoneNumber();
      } else {
        await verifyEmail();
      }
      
      window.location.href = '/dashboard.html';
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage(error.message, 'error');
  }
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userData');
  localStorage.removeItem('username');
  window.location.href = '/index.html';
}

// Check if user is logged in
function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// Show message function
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

// Event listeners for forms
document.addEventListener('DOMContentLoaded', function() {
  // Signup form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const phoneNumber = document.getElementById('phone').value;
      const invitationCode = document.getElementById('invitation-code').value;
      
      // Validate passwords match
      if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
      }
      
      signup(username, email, password, phoneNumber, invitationCode);
    });
  }
  
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      login(email, password);
    });
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
  
  // Check if user is logged in on protected pages
  if (!isLoggedIn() && !window.location.pathname.includes('index.html') && !window.location.pathname.includes('signup.html')) {
    window.location.href = '/index.html';
  }
});
