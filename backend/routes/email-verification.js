// @route   POST api/email-verification/verify-email
// @desc    Verify email with code
// @access  Private
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const CryptoAddress = require('../models/CryptoAddress');
const { sendVerificationEmail } = require('../utils/emailService');

router.post('/verify-email', auth, async (req, res) => {
  const { verificationCode } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ msg: 'Email already verified' });
    }

    // Check if code is valid and not expired
    if (user.emailVerificationCode !== verificationCode) {
      return res.status(400).json({ msg: 'Invalid verification code' });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ msg: 'Verification code has expired' });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;

    // Assign crypto addresses to user
    const btcAddress = await CryptoAddress.findOne({ 
      type: 'BTC', 
      isAssigned: false 
    });
    
    const ethAddress = await CryptoAddress.findOne({ 
      type: 'ETH', 
      isAssigned: false 
    });

    if (!btcAddress || !ethAddress) {
      return res.status(500).json({ msg: 'Unable to assign crypto addresses' });
    }

    // Assign addresses to user
    user.btcAddress = btcAddress.address;
    user.ethAddress = ethAddress.address;

    // Update address assignment
    btcAddress.isAssigned = true;
    btcAddress.assignedTo = user._id;
    btcAddress.assignedAt = Date.now();

    ethAddress.isAssigned = true;
    ethAddress.assignedTo = user._id;
    ethAddress.assignedAt = Date.now();

    // Save all changes
    await user.save();
    await btcAddress.save();
    await ethAddress.save();

    res.json({ msg: 'Email verified successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/email-verification/resend
// @desc    Resend email verification code
// @access  Private
router.post('/resend', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ msg: 'Email already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, verificationCode);

    res.json({ msg: 'Verification code sent successfully to your email' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Helper function to generate verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = router;