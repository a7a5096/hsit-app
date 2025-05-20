import React, { useState } from 'react';
import axios from 'axios';
import './SignupForm.css';

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
  };

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
        setCryptoAddresses(response.data.addresses);
        setSuccess('Account created successfully');
        setStep(3);
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
                Bitcoin deposits will be automatically converted to UBT
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
                Ethereum deposits will be automatically converted to UBT
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignupForm;
