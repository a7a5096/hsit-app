# HSIT Mobile Website Documentation

## Overview

This documentation provides a comprehensive guide to the HSIT mobile website implementation. The website allows users to sign up, verify their phone numbers, deposit and withdraw cryptocurrency, exchange UBT tokens, and participate in an invitation system with bonuses.

## System Architecture

The application consists of:

1. **Frontend**: HTML, CSS, and JavaScript for the mobile web interface
2. **Backend**: Node.js with Express.js for the API server
3. **Database**: MongoDB for data storage
4. **Authentication**: JWT-based authentication with phone verification via Twilio
5. **Deployment**: AWS Amplify for hosting and deployment

## Core Features

### 1. User Authentication

- Email and password registration
- Phone verification via SMS using Twilio
- JWT-based authentication for API access
- Session management with localStorage

### 2. Crypto Address Assignment

- Each verified user is assigned unique BTC and ETH addresses from CSV files
- Once an address is assigned, it cannot be used again
- Addresses are displayed on the deposit page with QR codes

### 3. Deposit/Withdrawal System

- Users can deposit BTC, ETH, and USDT to their assigned addresses
- Withdrawal requests are sent to the admin via email or SMS
- Transaction history is maintained for all deposits and withdrawals

### 4. UBT Exchange Mechanism

- UBT can be exchanged for USDT at a rate starting at 1:1
- Exchange rate increases by 4% every time someone makes a withdrawal
- Buying UBT is fixed at 0.98% of the current exchange rate
- Users can buy UBT using their crypto balance

### 5. Invitation System

- Each user gets a unique invitation code
- Users can share invitation links or codes
- Bonuses are awarded for successful invites:
  - 10 UBT for every bot purchased by direct invites
  - 15 UBT for every bot purchased by second-level invites
  - 1 free 500 bot for users with 10 qualified invites

## Technical Implementation

### Backend Structure

```
/backend
  /config       - Configuration files
  /controllers  - Request handlers
  /middleware   - Authentication middleware
  /models       - MongoDB schemas
  /routes       - API routes
  /scripts      - Utility scripts
  /utils        - Helper functions
  server.js     - Main server file
```

### Database Models

1. **User**: Stores user information, balances, and assigned crypto addresses
2. **CryptoAddress**: Tracks all crypto addresses and their assignment status
3. **Transaction**: Records all deposits, withdrawals, and exchanges
4. **ExchangeRate**: Maintains the current UBT exchange rate
5. **Invitation**: Manages invitation codes and relationships

### API Endpoints

#### Authentication
- `POST /api/auth`: Login
- `GET /api/auth`: Get current user

#### Users
- `POST /api/users`: Register new user
- `POST /api/users/verify-phone`: Verify phone number
- `POST /api/users/resend-verification`: Resend verification code

#### Crypto
- `GET /api/crypto/addresses`: Get user's crypto addresses
- `GET /api/crypto/qrcode/:currency`: Generate QR code for address

#### Transactions
- `GET /api/transactions`: Get user's transaction history
- `POST /api/transactions/withdraw`: Request withdrawal
- `GET /api/transactions/exchange-rates`: Get current exchange rates
- `POST /api/transactions/buy-ubt`: Buy UBT with crypto

#### Invitations
- `GET /api/invitations`: Get user's invitation code
- `POST /api/invitations/generate`: Generate new invitation code
- `GET /api/invitations/team`: Get user's team information

## Frontend Structure

```
/
  /css          - Stylesheets
  /js           - JavaScript files
  /images       - Image assets
  /public       - Public assets (QR codes)
  index.html    - Login page
  signup.html   - Registration page
  dashboard.html - Main dashboard
  deposit.html  - Deposit page
  asset_center.html - Asset management
  my_team.html  - Team and invitation management
  transactions.html - Transaction history
  ubt_exchange.html - UBT exchange page
```

### JavaScript Files

1. **auth.js**: Handles authentication, registration, and phone verification
2. **dashboard.js**: Manages dashboard functionality and navigation
3. **deposit.js**: Handles deposit address display and QR code generation
4. **asset_center.js**: Manages asset display and withdrawal requests
5. **transactions.js**: Displays transaction history
6. **ubt_exchange.js**: Handles UBT exchange functionality
7. **my_team.js**: Manages invitation system and team display

## Configuration

### Environment Variables

The application requires the following environment variables:

```
MONGODB_URI=mongodb://localhost:27017/hsit
JWT_SECRET=your_jwt_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
ADMIN_EMAIL=a7a5096@googlemail.com
ADMIN_PHONE=931-321-0988
UBT_INITIAL_EXCHANGE_RATE=1
UBT_RATE_INCREASE=0.04
UBT_BUY_RATE_FACTOR=0.98
```

## Deployment

The application is configured for deployment to AWS Amplify. See the `deployment-guide.md` file for detailed deployment instructions.

## Testing

A comprehensive test script is provided in `/backend/scripts/testAllFunctionality.js` to verify all features are working correctly.

To run the tests:

```bash
cd /path/to/project
node backend/scripts/testAllFunctionality.js
```

## Maintenance and Updates

### Adding New Crypto Addresses

1. Add new addresses to the respective CSV files (bitcoin.csv, ethereum.csv)
2. Run the import script:

```bash
node backend/scripts/importAddresses.js
```

### Monitoring Withdrawal Requests

Withdrawal requests are sent to the admin email and phone number. Process these requests manually and update the transaction status in the database.

### Updating Exchange Rates

The exchange rate automatically increases by 4% with each withdrawal. The current rate is stored in the ExchangeRate collection in the database.

## Security Considerations

1. All API endpoints are protected with JWT authentication
2. Phone verification adds an extra layer of security
3. Sensitive operations require re-authentication
4. Passwords are hashed before storage
5. Environment variables are used for sensitive configuration

## Support and Contact

For any issues or questions, please contact the admin at:
- Email: a7a5096@googlemail.com
- Phone: 931-321-0988
