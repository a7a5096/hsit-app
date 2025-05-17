# Database Storage Correction Plan

## Overview
This document outlines the necessary corrections to migrate critical data from localStorage to proper database storage. The application already has appropriate backend models, but the frontend code needs to be updated to use API endpoints instead of localStorage for data persistence.

## 1. Crypto Address Assignment Corrections

### Current Issue
Cryptocurrency addresses are stored in localStorage instead of being associated with user accounts in the database.

### Proposed Solution

#### Backend Changes
1. Create/enhance API endpoints:
```javascript
// backend/routes/cryptoAddresses.js
router.post('/api/crypto/assign', auth, async (req, res) => {
  try {
    const { type, address } = req.body;
    const userId = req.user.id;
    
    // Find an unassigned address or create one
    let cryptoAddress = await CryptoAddress.findOne({ 
      type, 
      isAssigned: false 
    });
    
    if (!cryptoAddress) {
      // Handle case when no addresses are available
      return res.status(404).json({ message: 'No addresses available' });
    }
    
    // Assign to user
    cryptoAddress.isAssigned = true;
    cryptoAddress.assignedTo = userId;
    cryptoAddress.assignedAt = Date.now();
    await cryptoAddress.save();
    
    // Update user model as well
    if (type === 'BTC') {
      await User.findByIdAndUpdate(userId, { btcAddress: address });
    } else if (type === 'ETH') {
      await User.findByIdAndUpdate(userId, { ethAddress: address });
    }
    
    return res.status(200).json({ 
      success: true, 
      address: cryptoAddress.address 
    });
  } catch (error) {
    console.error('Error assigning crypto address:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/api/crypto/addresses', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's assigned addresses
    const user = await User.findById(userId);
    const btcAddresses = await CryptoAddress.find({ 
      assignedTo: userId, 
      type: 'BTC' 
    });
    const ethAddresses = await CryptoAddress.find({ 
      assignedTo: userId, 
      type: 'ETH' 
    });
    
    return res.status(200).json({
      bitcoin: user.btcAddress || (btcAddresses[0] ? btcAddresses[0].address : null),
      ethereum: user.ethAddress || (ethAddresses[0] ? ethAddresses[0].address : null),
      usdt: user.ethAddress || (ethAddresses[0] ? ethAddresses[0].address : null) // USDT uses ETH address
    });
  } catch (error) {
    console.error('Error fetching crypto addresses:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});
```

#### Frontend Changes
Replace localStorage usage in `direct_crypto_assignment.js`:

```javascript
// Replace localStorage-based assignment
function assignCryptoAddresses(userId) {
  // Get token from localStorage (only authentication token should remain in localStorage)
  const token = localStorage.getItem('token');
  
  // Fetch user's assigned addresses from the server
  fetch(`${API_URL}/api/crypto/addresses`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch addresses');
    }
    return response.json();
  })
  .then(data => {
    // Use the addresses returned from the server
    showAddressesModal({
      bitcoin: data.bitcoin,
      ethereum: data.ethereum,
      usdt: data.usdt
    });
  })
  .catch(error => {
    console.error('Error fetching crypto addresses:', error);
    showError('Failed to load your crypto addresses. Please try again later.');
  });
}
```

Similar changes for `simple_crypto_assignment.js`.

## 2. User Data Storage Corrections

### Current Issue
User data is stored in localStorage instead of being fetched from the server when needed.

### Proposed Solution

#### Backend Changes
Ensure user data API endpoint returns all necessary information:

```javascript
// backend/routes/users.js
router.get('/api/users/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('-password')
      .populate('invitedUsers', 'username email createdAt');
      
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});
```

#### Frontend Changes
Replace userData localStorage usage in all files:

```javascript
// Replace in auth.js, feeling_lucky.js, my_team.js, etc.
function getUserData() {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      reject(new Error('Not authenticated'));
      return;
    }
    
    fetch(`${API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      return response.json();
    })
    .then(userData => {
      resolve(userData);
    })
    .catch(error => {
      console.error('Error fetching user data:', error);
      reject(error);
    });
  });
}

// Example usage in feeling_lucky.js
function updateUserInterface() {
  getUserData()
    .then(userData => {
      // Update UI with fresh data from server
      document.getElementById('balance').textContent = userData.balances.ubt.toFixed(2);
      // Other UI updates...
    })
    .catch(error => {
      console.error('Error updating UI:', error);
      showError('Failed to load your data. Please refresh the page.');
    });
}
```

## 3. Referral System Corrections

### Current Issue
User emails for referrals are stored in localStorage instead of being handled through the database.

### Proposed Solution

#### Backend Changes
Enhance invitation API endpoints:

```javascript
// backend/routes/invitations.js
router.post('/api/invitations/track', async (req, res) => {
  try {
    const { code, email } = req.body;
    
    // Store referral tracking in a session or temporary database record
    // This avoids using localStorage for tracking before registration
    const tracking = new ReferralTracking({
      code,
      email,
      createdAt: Date.now(),
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
    });
    
    await tracking.save();
    
    // Set a cookie as an alternative to localStorage
    res.cookie('referral_code', code, { 
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: false // Allow JavaScript access
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking referral:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});
```

#### Frontend Changes
Replace localStorage usage in referral system:

```javascript
// username_referral_system.js
function trackReferral(code, email) {
  // Instead of localStorage, send to server
  fetch(`${API_URL}/api/invitations/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, email })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to track referral');
    }
    return response.json();
  })
  .then(data => {
    console.log('Referral tracked successfully');
  })
  .catch(error => {
    console.error('Error tracking referral:', error);
  });
}

// Get referral code from cookie instead of localStorage
function getReferralCode() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'referral_code') {
      return value;
    }
  }
  return null;
}
```

## 4. Authentication Token Handling

### Current Issue
While storing authentication tokens in localStorage is common for client-side auth, it should be properly secured.

### Proposed Solution

#### Security Enhancements
1. Add token expiration and refresh mechanism:

```javascript
// auth.js
function refreshToken() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return Promise.reject(new Error('No token found'));
  }
  
  return fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    return response.json();
  })
  .then(data => {
    localStorage.setItem('token', data.token);
    return data.token;
  });
}

// Add token validation on protected pages
function validateToken() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    window.location.href = 'index.html?require_login=true';
    return Promise.reject(new Error('No token found'));
  }
  
  return fetch(`${API_URL}/api/auth/validate`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      // Token invalid or expired
      localStorage.removeItem('token');
      window.location.href = 'index.html?require_login=true';
      throw new Error('Invalid token');
    }
    return true;
  });
}
```

## Implementation Strategy

1. **Phase 1: Backend API Enhancement**
   - Implement all required API endpoints
   - Test endpoints with Postman or similar tool
   - Ensure proper error handling and validation

2. **Phase 2: Frontend Refactoring**
   - Update authentication handling first
   - Replace localStorage data storage with API calls
   - Implement proper loading states and error handling
   - Test on development environment

3. **Phase 3: Testing and Validation**
   - Test user flows end-to-end
   - Verify data persistence across sessions
   - Ensure performance is acceptable with server-side storage
   - Validate security of all API endpoints

4. **Phase 4: Deployment**
   - Deploy backend changes first
   - Deploy frontend changes
   - Monitor for any issues
   - Have rollback plan ready

## Conclusion

By implementing these changes, the application will properly store all critical data in the database rather than relying on localStorage workarounds. This will make the application production-ready, more secure, and provide a consistent experience across different devices and browsers.
