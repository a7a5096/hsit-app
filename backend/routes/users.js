const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const auth = require('../middleware/auth');
const User = require('../models/User');
const CryptoAddress = require('../models/CryptoAddress');
const Invitation = require('../models/Invitation');
const { generateVerificationCode, generateInvitationCode } = require('../utils/helpers');
const { sendVerificationSMS } = require('../utils/smsService');

// @route   POST api/users
// @desc    Register a user
// @access  Public
router.post('/', async (req, res) => {
  const { username, email, password, phoneNumber, invitationCode, verificationMethod = 'email' } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists with this email' });
    }

    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'Username is already taken' });
    }

    // Check invitation code if provided
    let inviter = null;
    if (invitationCode) {
      const invitation = await Invitation.findOne({ 
        code: invitationCode,
        isUsed: false
      });

      if (!invitation) {
        return res.status(400).json({ msg: 'Invalid or already used invitation code' });
      }

      inviter = await User.findById(invitation.createdBy);
      if (!inviter) {
        return res.status(400).json({ msg: 'Inviter not found' });
      }
    }

    // Generate verification codes
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Generate unique invitation code for the new user
    const userInvitationCode = generateInvitationCode();

    // Create new user with verification method
    user = new User({
      username,
      email,
      password,
      phoneNumber: phoneNumber || null,
      invitationCode: userInvitationCode,
      invitedBy: inviter ? inviter._id : null,
      verificationMethod: verificationMethod
    });

    // Set verification details based on method
    if (verificationMethod === 'phone' && phoneNumber) {
      user.phoneVerificationCode = verificationCode;
      user.phoneVerificationExpires = verificationExpires;
    } else {
      // Default to email verification if phone not provided or method is email
      user.emailVerificationCode = verificationCode;
      user.emailVerificationExpires = verificationExpires;
      user.verificationMethod = 'email';
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user
    await user.save();

    // If user was invited, update invitation and inviter
    if (inviter) {
      const invitation = await Invitation.findOne({ code: invitationCode });
      invitation.usedBy = user._id;
      invitation.isUsed = true;
      invitation.usedAt = Date.now();
      await invitation.save();

      inviter.invitedUsers.push(user._id);
      await inviter.save();
    }

    // Create a new invitation record for the user
    const newInvitation = new Invitation({
      code: userInvitationCode,
      createdBy: user._id
    });
    await newInvitation.save();

    // Send verification based on method
    if (user.verificationMethod === 'phone' && phoneNumber) {
      // Send SMS verification
      await sendVerificationSMS(phoneNumber, verificationCode);
    } else {
      // Send email verification
      const { sendVerificationEmail } = require('../utils/emailService');
      await sendVerificationEmail(email, verificationCode);
    }

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRE },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          verificationMethod: user.verificationMethod
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/users/verify-phone
// @desc    Verify phone number with code
// @access  Private
router.post('/verify-phone', auth, async (req, res) => {
  const { verificationCode } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if already verified
    if (user.isPhoneVerified) {
      return res.status(400).json({ msg: 'Phone number already verified' });
    }

    // Check if code is valid and not expired
    if (user.phoneVerificationCode !== verificationCode) {
      return res.status(400).json({ msg: 'Invalid verification code' });
    }

    if (new Date() > user.phoneVerificationExpires) {
      return res.status(400).json({ msg: 'Verification code has expired' });
    }

    // Mark phone as verified
    user.isPhoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationExpires = null;

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

    res.json({ msg: 'Phone number verified successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/users/resend-verification
// @desc    Resend verification code
// @access  Private
router.post('/resend-verification', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if already verified
    if (user.isPhoneVerified) {
      return res.status(400).json({ msg: 'Phone number already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.phoneVerificationCode = verificationCode;
    user.phoneVerificationExpires = verificationExpires;
    await user.save();

    // Send verification SMS
    await sendVerificationSMS(user.phoneNumber, verificationCode);

    res.json({ msg: 'Verification code sent successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -phoneVerificationCode -phoneVerificationExpires');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
