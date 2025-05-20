// Frontend Component - SignupForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

const SignupForm = () => {
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  
  // UI state
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [cryptoAddresses, setCryptoAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  // API routes
// Initial registration - collect user info and send verification code
app.post('/api/auth/register/initial', async (req, res) => {
  try {
    const { username, email, password, phoneNumber } = req.body;
    
    // Validate inputs
    if (!username || !email || !password || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { username },
        { email },
        { phoneNumber }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username, email, or phone number already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user document but don't save yet (wait for verification)
    const tempUser = {
      username,
      email,
      password: hashedPassword,
      phoneNumber
    };
    
    // Store temp user in session
    req.session.tempUser = tempUser;
    
    // Send verification code via SMS
    const smsSent = await sendVerificationCode(phoneNumber);
    
    if (!smsSent) {
      return res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
    
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify SMS code
app.post('/api/auth/verify-sms', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    
    // Validate inputs
    if (!phoneNumber || !code) {
      return res.status(400).json({ success: false, message: 'Phone number and code are required' });
    }
    
    // Check if we have temp user data
    if (!req.session.tempUser || req.session.tempUser.phoneNumber !== phoneNumber) {
      return res.status(400).json({ success: false, message: 'Session expired, please start registration again' });
    }
    
    // Verify the code
    const verification = verifyCode(phoneNumber, code);
    
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.message });
    }
    
    // Get crypto addresses for the user
    const cryptoAddresses = await getAvailableCryptoAddresses();
    
    // Ensure we have all required addresses
    if (!cryptoAddresses.bitcoin || !cryptoAddresses.ethereum || !cryptoAddresses.ubt) {
      return res.status(500).json({ success: false, message: 'Unable to allocate crypto addresses' });
    }
    
    // Create and save the user
    const user = new User({
      ...req.session.tempUser,
      phoneVerified: true,
      walletAddresses: {
        bitcoin: cryptoAddresses.bitcoin.address,
        ethereum: cryptoAddresses.ethereum.address,
        ubt: cryptoAddresses.ubt.address
      }
    });
    
    await user.save();
    
    // Mark addresses as assigned
    await markAddressAsAssigned('bitcoin', cryptoAddresses.bitcoin.address);
    await markAddressAsAssigned('ethereum', cryptoAddresses.ethereum.address);
    await markAddressAsAssigned('ubt', cryptoAddresses.ubt.address);
    
    // Clear temp user data
    delete req.session.tempUser;
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );
    
    res.json({
      success: true,
      userId: user._id,
      token,
      addresses: [
        cryptoAddresses.bitcoin.address,
        cryptoAddresses.ethereum.address,
        cryptoAddresses.ubt.address
      ]
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Resend verification code
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Check if we have temp user data
    if (!req.session.tempUser || req.session.tempUser.phoneNumber !== phoneNumber) {
      return res.status(400).json({ success: false, message: 'Session expired, please start registration again' });
    }
    
    // Send verification code via SMS
    const smsSent = await sendVerificationCode(phoneNumber);
    
    if (!smsSent) {
      return res.status(500).json({ success: false, message: 'Failed to send verification code' });
    }
    
    res.json({ success: true, message: 'Verification code resent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Webhook for crypto deposits
app.post('/api/webhook/crypto-deposit', async (req, res) => {
  try {
    const { address, amount, currency, txHash } = req.body;
    
    // Find user by wallet address
    const user = await User.findOne({
      $or: [
        { 'walletAddresses.bitcoin': address },
        { 'walletAddresses.ethereum': address },
        { 'walletAddresses.ubt': address }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found for this address' });
    }
    
    // Convert amount to UBT based on current rates
    let ubtAmount;
    
    if (currency === 'UBT') {
      ubtAmount = amount;
    } else {
      // Get current exchange rate from a service or use the configured rates
      // For simplicity, using the configured initial rate
      ubtAmount = amount * UBT_INITIAL_EXCHANGE_RATE;
    }
    
    // Update user's UBT balance
    user.cryptoBalance += ubtAmount;
    await user.save();
    
    // Log the transaction
    const transaction = new Transaction({
      userId: user._id,
      txHash,
      fromAddress: address,
      amount,
      currency,
      ubtAmount,
      status: 'completed',
      timestamp: Date.now()
    });
    
    await transaction.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Deposit webhook error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user balance (UBT only) - encrypted for security
app.get('/api/user/balance', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Only return UBT balance, never individual wallet balances
    res.json({
      success: true,
      balance: user.cryptoBalance
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// JWT Authentication middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid token' });
    }
    
    req.user = user;
    next();
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

  // Handle form submission for step 1
  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validate form data
    if (!formData.username || !formData.email || !formData.password || !formData.phoneNumber) {
      setError('All fields are required');
      setLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      // Send initial registration data to backend
      const response = await axios.post('/api/auth/register/initial', formData);
      
      if (response.data.success) {
        setSuccess('Verification code sent to your phone');
        setStep(2);
      } else {
        setError(response.data.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code submission
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!verificationCode) {
      setError('Verification code is required');
      setLoading(false);
      return;
    }
    
    try {
      // Send verification code to backend
      const response = await axios.post('/api/auth/verify-sms', {
        phoneNumber: formData.phoneNumber,
        code: verificationCode
      });
      
      if (response.data.success) {
        // Get crypto addresses from backend
        const addressesResponse = await axios.post('/api/wallet/create', {
          userId: response.data.userId
        });
        
        if (addressesResponse.data.success) {
          setCryptoAddresses(addressesResponse.data.addresses);
          setSuccess('Account created successfully');
          setStep(3);
        } else {
          setError('Failed to create wallet addresses');
        }
      } else {
        setError(response.data.message || 'Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle resending verification code
  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/auth/resend-verification', {
        phoneNumber: formData.phoneNumber
      });
      
      if (response.data.success) {
        setSuccess('Verification code resent to your phone');
      } else {
        setError(response.data.message || 'Failed to resend code');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <h1>Create Your Account</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {step === 1 && (
        <form onSubmit={handleSubmitStep1}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength="8"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number (for verification)</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="+1 (555) 555-5555"
              required
            />
            <small>We'll send a verification code to this number via Twilio</small>
          </div>
          
          <button type="submit" disabled={loading} className="primary-button">
            {loading ? 'Sending...' : 'Continue'}
          </button>
        </form>
      )}
      
      {step === 2 && (
        <form onSubmit={handleVerifyCode} className="verification-form">
          <div className="form-group">
            <label htmlFor="verificationCode">Enter Verification Code</label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              placeholder="123456"
              className="verification-input"
            />
            <small>Enter the 6-digit code sent to your phone</small>
          </div>
          
          <button type="submit" disabled={loading} className="primary-button">
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          
          <button 
            type="button" 
            className="secondary-button" 
            onClick={handleResendCode}
            disabled={loading}
          >
            Resend Code
          </button>
        </form>
      )}
      
      {step === 3 && (
        <div className="success-container">
          <h2>Account Created Successfully</h2>
          <p className="deposit-instruction">You can now deposit funds using these addresses:</p>
          
          <div className="crypto-addresses">
            <div className="address-card">
              <h3>Bitcoin Deposit Address</h3>
              <p className="address-text">{cryptoAddresses[0]}</p>
              <button 
                className="copy-button" 
                onClick={() => navigator.clipboard.writeText(cryptoAddresses[0])}
              >
                Copy Address
              </button>
              <p className="address-note">
                Bitcoin deposits will be automatically converted to UBT at rate: {UBT_INITIAL_EXCHANGE_RATE}
              </p>
            </div>
            
            <div className="address-card">
              <h3>Ethereum Deposit Address</h3>
              <p className="address-text">{cryptoAddresses[1]}</p>
              <button 
                className="copy-button" 
                onClick={() => navigator.clipboard.writeText(cryptoAddresses[1])}
              >
                Copy Address
              </button>
              <p className="address-note">
                Ethereum deposits will be automatically converted to UBT at rate: {UBT_INITIAL_EXCHANGE_RATE}
              </p>
            </div>
            
            <div className="address-card">
              <h3>UBT Deposit Address</h3>
              <p className="address-text">{cryptoAddresses[2]}</p>
              <button 
                className="copy-button" 
                onClick={() => navigator.clipboard.writeText(cryptoAddresses[2])}
              >
                Copy Address
              </button>
              <p className="address-note">
                UBT deposits are credited at 1:1 ratio
              </p>
            </div>
          </div>
          
          <div className="important-note">
            <p><strong>Important:</strong> Your crypto balance will be displayed in UBT only. 
            Individual wallet balances are not visible to users.</p>
          </div>
          
          <div className="next-steps">
            <p>What would you like to do next?</p>
            <button 
              onClick={() => window.location.href = '/dashboard'} 
              className="primary-button"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* SignupForm.css */
.signup-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 30px;
  background-color: #1e1e1e;
  color: #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #ffffff;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 12px;
  background-color: #2d2d2d;
  color: #ffffff;
  border: 1px solid #3a3a3a;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s;
}

input:focus {
  border-color: #6246ea;
  outline: none;
  box-shadow: 0 0 0 2px rgba(98, 70, 234, 0.2);
}

small {
  display: block;
  margin-top: 5px;
  color: #a0a0a0;
  font-size: 14px;
}

.primary-button, .secondary-button, .copy-button {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
}

.primary-button {
  background-color: #6246ea;
  color: white;
}

.primary-button:hover {
  background-color: #5039d1;
  transform: translateY(-1px);
}

.primary-button:disabled {
  background-color: #4a3b99;
  cursor: not-allowed;
}

.secondary-button {
  background-color: transparent;
  color: #6246ea;
  border: 1px solid #6246ea;
  margin-top: 12px;
}

.secondary-button:hover {
  background-color: rgba(98, 70, 234, 0.1);
}

.error-message, .success-message {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
}

.error-message {
  background-color: rgba(220, 53, 69, 0.1);
  color: #f48a96;
  border: 1px solid rgba(220, 53, 69, 0.3);
}

.success-message {
  background-color: rgba(25, 135, 84, 0.1);
  color: #59d499;
  border: 1px solid rgba(25, 135, 84, 0.3);
}

.verification-form {
  max-width: 400px;
  margin: 0 auto;
}

.verification-input {
  text-align: center;
  letter-spacing: 4px;
  font-size: 24px;
}

.crypto-addresses {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 20px;
}

.address-card {
  background-color: #2d2d2d;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #3a3a3a;
}

.address-card h3 {
  margin-top: 0;
  color: #6246ea;
  font-size: 18px;
  margin-bottom: 12px;
}

.address-text {
  background-color: #1e1e1e;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  overflow-wrap: break-word;
  word-break: break-all;
  margin-bottom: 10px;
  border: 1px solid #3a3a3a;
}

.copy-button {
  background-color: #2d2d2d;
  border: 1px solid #3a3a3a;
  color: #f0f0f0;
  padding: 8px;
  font-size: 14px;
}

.copy-button:hover {
  background-color: #3a3a3a;
}

.address-note {
  margin-top: 12px;
  font-size: 14px;
  color: #a0a0a0;
}

.success-container {
  text-align: center;
}

.deposit-instruction {
  margin-bottom: 20px;
  font-size: 18px;
}

.important-note {
  margin-top: 30px;
  padding: 15px;
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 4px;
  color: #ffd15c;
}

.next-steps {
  margin-top: 30px;
}

@media (min-width: 768px) {
  .crypto-addresses {
    grid-template-columns: repeat(1, 1fr);
  }
}

/* Add some animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.signup-container {
  animation: fadeIn 0.5s ease-out;
}

// Backend - server.js
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Web3 = require('web3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Constants from environment
const ADMIN_EMAIL = 'a7a5096@googolemail.com';
const ADMIN_PHONE = '931-321-0988';
const CORS_ALLOWED_ORIGINS = 'https://hsit-app.onrender.com';
const JWT_EXPIRE = '30d';
const JWT_SECRET = 'hsit_jwt_secret_key_2025';
const MONGO_URI = 'mongodb+srv://a7a5096:MMG0nngg2@cluster0hsit.xelat83.mongodb.net/hsit_app?retryWrites=true&w=majority&appName=ClusterHSIT';
const NODE_ENV = 'production';

// Twilio credentials from environment
const TWILIO_ACCOUNT_SID = 'ACa349c314fae309a21427c73a204d7afc';
const TWILIO_AUTH_TOKEN = '29ebf5ec303ed1208d74592b114d2a31';
const TWILIO_MESSAGING_SERVICE_SID = 'MGb413018fd7fa879047e1a878beade3fc';
const TWILIO_PHONE_NUMBER = '+15873304312';

// UBT exchange rate settings
const UBT_INITIAL_EXCHANGE_RATE = 1;
const UBT_RATE_INCREASE = 0.04;

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: CORS_ALLOWED_ORIGINS,
  credentials: true
}));

// Connect to MongoDB
mongoose.connect(MONGO_URI);

// Twilio client setup
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Web3 setup - for interacting with blockchain
const web3 = new Web3('https://mainnet.infura.io/v3/YOUR_INFURA_KEY'); // Replace with your infura key

// Path to crypto wallet CSV files
const BITCOIN_CSV_PATH = '/etc/secrets/bitcoin.csv';
const ETHEREUM_CSV_PATH = '/etc/secrets/ethereum.csv';
const UBT_CSV_PATH = '/etc/secrets/ubt.csv';

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  phoneVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  walletAddresses: {
    bitcoin: String,
    ethereum: String,
    ubt: String
  },
// Store verification codes temporarily
const verificationCodes = {};

// SMS verification functions
const sendVerificationCode = async (phoneNumber) => {
  try {
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with expiration
    verificationCodes[phoneNumber] = {
      code,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    
    // Send SMS via Twilio
    await twilioClient.messages.create({
      body: `Your HSIT verification code is: ${code}. Valid for 10 minutes.`,
      messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
      to: phoneNumber
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send verification code:', error);
    return false;
  }
};

// Verify the SMS code
const verifyCode = (phoneNumber, code) => {
  const storedData = verificationCodes[phoneNumber];
  
  if (!storedData) {
    return { valid: false, message: 'Verification code expired or not found' };
  }
  
  if (Date.now() > storedData.expires) {
    delete verificationCodes[phoneNumber];
    return { valid: false, message: 'Verification code expired' };
  }
  
  if (storedData.code !== code) {
    return { valid: false, message: 'Invalid verification code' };
  }
  
  // Code is valid, remove it from memory
  delete verificationCodes[phoneNumber];
  return { valid: true };
};

// Crypto address management
const getAvailableCryptoAddresses = async () => {
  try {
    // Addresses will be read from the secret CSV files
    const bitcoinAddresses = [];
    const ethereumAddresses = [];
    const ubtAddresses = [];
    
    // Read Bitcoin addresses from CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(BITCOIN_CSV_PATH)
        .pipe(csv())
        .on('data', (row) => {
          if (row.address && !row.assigned) {
            bitcoinAddresses.push({
              address: row.address,
              privateKey: row.privateKey
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Read Ethereum addresses from CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(ETHEREUM_CSV_PATH)
        .pipe(csv())
        .on('data', (row) => {
          if (row.address && !row.assigned) {
            ethereumAddresses.push({
              address: row.address,
              privateKey: row.privateKey
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Read UBT addresses from CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(UBT_CSV_PATH)
        .pipe(csv())
        .on('data', (row) => {
          if (row.address && !row.assigned) {
            ubtAddresses.push({
              address: row.address,
              privateKey: row.privateKey
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Return one address of each type
    return {
      bitcoin: bitcoinAddresses.length > 0 ? bitcoinAddresses[0] : null,
      ethereum: ethereumAddresses.length > 0 ? ethereumAddresses[0] : null,
      ubt: ubtAddresses.length > 0 ? ubtAddresses[0] : null
    };
  } catch (error) {
    console.error('Error fetching crypto addresses:', error);
    throw error;
  }
};

// Mark address as assigned in CSV file
const markAddressAsAssigned = async (type, address) => {
  try {
    let csvPath;
    
    switch (type) {
      case 'bitcoin':
        csvPath = BITCOIN_CSV_PATH;
        break;
      case 'ethereum':
        csvPath = ETHEREUM_CSV_PATH;
        break;
      case 'ubt':
        csvPath = UBT_CSV_PATH;
        break;
      default:
        throw new Error('Invalid address type');
    }
    
    // Read the CSV file
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Update the assigned field for the matching address
    const updatedRows = rows.map(row => {
      if (row.address === address) {
        return { ...row, assigned: 'true' };
      }
      return row;
    });
    
    // Write the updated CSV back
    const csvWriter = createCsvWriter({
      path: csvPath,
      header: Object.keys(updatedRows[0]).map(key => ({ id: key, title: key }))
    });
    
    await csvWriter.writeRecords(updatedRows);
    
    return true;
  } catch (error) {
    console.error(`Error marking ${type} address as assigned:`, error);
    throw error;
  }
};