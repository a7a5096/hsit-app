# Local Storage Workarounds Documentation

## Overview
This document identifies instances where localStorage is used to store critical data that should be stored in the database for production use. The backend has proper database models for storing user data, balances, addresses, and transactions, but the frontend code contains multiple instances where localStorage is used as a workaround.

## Critical Issues

### 1. Crypto Address Assignments
**Files affected:**
- `frontend/public/js/direct_crypto_assignment.js`
- `frontend/public/js/simple_crypto_assignment.js`

**Issue:**
Cryptocurrency addresses are being stored in localStorage instead of being properly associated with user accounts in the database. The backend has a `CryptoAddressSchema` model that should be used instead.

**Code examples:**
```javascript
// direct_crypto_assignment.js
const allAssignments = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}');
localStorage.setItem(CONFIG.storageKey, JSON.stringify(allAssignments));
```

```javascript
// simple_crypto_assignment.js
const allAssignments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
localStorage.setItem(STORAGE_KEY, JSON.stringify(allAssignments));
```

### 2. User Authentication and Data
**Files affected:**
- `frontend/public/js/auth.js`
- `frontend/public/js/feeling_lucky.js`
- `frontend/public/js/my_team.js`

**Issue:**
User authentication tokens and user data are stored in localStorage. While tokens in localStorage are common for client-side auth, critical user data should be fetched from the server when needed rather than stored locally.

**Code examples:**
```javascript
// auth.js
function isAuthenticated() {
    return !!localStorage.getItem("token");
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userData");
    window.location.href = "index.html";
}
```

```javascript
// feeling_lucky.js
localStorage.setItem('userData', JSON.stringify(data));
let userData = JSON.parse(localStorage.getItem('userData') || '{}');
```

### 3. User Email and Referral System
**Files affected:**
- `frontend/public/js/username_referral_system.js`
- `frontend/public/referral_system_test.html`

**Issue:**
User emails are stored in localStorage for the referral system, which should be handled through the database using the User model.

**Code examples:**
```javascript
// username_referral_system.js
userEmail = localStorage.getItem('userEmail');
```

```html
// referral_system_test.html
localStorage.setItem('userEmail', 'localuser@example.com');
```

## Backend Models Available

The backend has proper models for storing this data:

1. **User Model** - Contains fields for:
   - User authentication
   - Balances for BTC, ETH, USDT, UBT
   - Crypto addresses (btcAddress, ethAddress)
   - Invitation and referral data

2. **CryptoAddress Model** - For managing crypto addresses:
   - Type (BTC, ETH)
   - Address
   - Assignment status
   - User assignment

3. **Transaction Model** - For tracking all financial activities:
   - Transaction type
   - Currency
   - Amount
   - Status
   - Wallet address

4. **Invitation Model** - For managing the referral system:
   - Invitation codes
   - Usage tracking
   - Bonus payment status

## Conclusion

The application has a proper database structure in the backend but is not fully utilizing it in the frontend. Instead, the frontend is using localStorage as a workaround for storing critical data that should be persisted in the database. This approach is not suitable for production as it:

1. Creates data inconsistency between client and server
2. Risks data loss when users clear browser data
3. Prevents access to user data across different devices
4. Makes it impossible to perform server-side operations on this data
5. Creates security vulnerabilities by storing sensitive information client-side
