const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Make sure this config file exists and exports JWT_SECRET and JWT_EXPIRE correctly
// If using environment variables directly (recommended), you might not need this file.
// const config = require('../config/config');
const auth = require('../middleware/auth');
const User = require('../models/User');
const CryptoAddress = require('../models/CryptoAddress');
const Invitation = require('../models/Invitation');
const { generateVerificationCode, generateInvitationCode } = require('../utils/helpers');
const { sendVerificationSMS } = require('../utils/smsService');
const { sendVerificationEmail } = require('../utils/emailService'); // Assuming this exists

// @route   POST api/users
// @desc    Register a user
// @access  Public
router.post('/', async (req, res) => {
    // Use 'phone' if your HTML input name is 'phone', otherwise use 'phoneNumber'
    const { username, email, password, phone, invitationCode, verificationMethod = 'email' } = req.body;

    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ msg: 'Please provide username, email, and password' });
    }
    // Add more validation as needed (e.g., password length, email format)

    try {
        // --- 1. Check if user already exists ---
        let existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ msg: 'User already exists with this email' });
        }

        let existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
            return res.status(400).json({ msg: 'Username is already taken' });
        }

        // --- 2. Validate Invitation Code (if provided) ---
        let inviterId = null;
        let validInvitation = null; // Store the found invitation document

        // Only validate if a non-empty code was provided
        if (invitationCode && invitationCode.trim() !== '') {
            const codeToValidate = invitationCode.trim();
            validInvitation = await Invitation.findOne({
                code: codeToValidate,
                isUsed: false // Ensure the code hasn't been used
            });

            if (!validInvitation) {
                // Code is invalid (doesn't exist) or has already been used
                console.log(`Signup rejected: Invalid or used invitation code "${codeToValidate}"`);
                return res.status(400).json({ msg: 'Invalid or already used invitation code' });
            }

            // Check if the user who created the code still exists
            const inviterUser = await User.findById(validInvitation.createdBy);
            if (!inviterUser) {
                // Should rarely happen, but good to check
                console.log(`Signup rejected: Inviter user ID ${validInvitation.createdBy} not found for code "${codeToValidate}"`);
                // You might want to mark the invitation as invalid here if the creator is deleted
                return res.status(400).json({ msg: 'Inviter associated with the code not found' });
            }

            inviterId = inviterUser._id; // Store the inviter's ID
            console.log(`Signup using valid code "${codeToValidate}" from inviter ${inviterId}`);
        } else {
            console.log('Signup attempt without an invitation code.');
        }

        // --- 3. Prepare New User Data ---
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Generate a unique invitation code FOR this new user
        // Note: Assumes generateInvitationCode() ensures uniqueness, otherwise add retry logic
        const newUserInvitationCode = generateInvitationCode();

        const newUser = new User({
            username,
            email,
            password, // Will be hashed below
            phoneNumber: phone || null, // Use phone from request body
            invitationCode: newUserInvitationCode, // Store the code generated FOR this user
            invitedBy: inviterId, // Store the ID of the user who invited them (null if none)
            isEmailVerified: false,
            isPhoneVerified: false
            // Add balances, roles etc. with default values if needed
        });

        // --- 4. Set Verification Details ---
        // Determine primary verification method
        let actualVerificationMethod = 'email'; // Default to email
        if (verificationMethod === 'phone' && phone) {
             actualVerificationMethod = 'phone';
             newUser.phoneVerificationCode = verificationCode;
             newUser.phoneVerificationExpires = verificationExpires;
        } else {
            // If method is 'email' or phone wasn't provided, use email
             newUser.emailVerificationCode = verificationCode;
             newUser.emailVerificationExpires = verificationExpires;
        }
        newUser.verificationMethod = actualVerificationMethod;

        // --- 5. Hash Password ---
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(password, salt);

        // --- 6. Save New User ---
        await newUser.save();
        console.log(`New user ${newUser.username} (ID: ${newUser._id}) saved.`);

        // --- 7. Update Invitation Records (if applicable) ---
        if (validInvitation && inviterId) {
            // Mark the invitation code used by the new user
            validInvitation.usedBy = newUser._id;
            validInvitation.isUsed = true;
            validInvitation.usedAt = new Date();
            await validInvitation.save();
            console.log(`Invitation code ${validInvitation.code} marked as used by ${newUser._id}.`);

            // Optionally, update the inviter's record (if you track invitedUsers directly)
            // await User.findByIdAndUpdate(inviterId, { $push: { invitedUsers: newUser._id } });
            // console.log(`User ${newUser._id} added to invitedUsers list of ${inviterId}.`);
            // Note: If the invitedUsers list can get large, consider querying Invitations instead.
            const inviter = await User.findById(inviterId);
            if (inviter) {
                inviter.invitedUsers.push(newUser._id);
                await inviter.save();
                console.log(`User ${newUser._id} added to invitedUsers list of ${inviterId}.`);
            }

        }

        // --- 8. Create New Invitation Record for the Registered User ---
        const invitationForNewUser = new Invitation({
            code: newUserInvitationCode,
            createdBy: newUser._id,
            isUsed: false // Newly created codes are not used
        });
        await invitationForNewUser.save();
        console.log(`Created new invitation record with code ${newUserInvitationCode} for user ${newUser._id}.`);


        // --- 9. Send Verification Message ---
        if (actualVerificationMethod === 'phone') {
            try {
                await sendVerificationSMS(phone, verificationCode);
                console.log(`Sent verification SMS to ${phone}`);
            } catch (smsError) {
                console.error(`Failed to send verification SMS to ${phone}:`, smsError);
                // Decide how to handle SMS failure - maybe fallback to email or log for admin?
                // Potentially return an error or a specific message to the user
            }
        } else {
            try {
                await sendVerificationEmail(email, verificationCode);
                console.log(`Sent verification email to ${email}`);
            } catch(emailError) {
                console.error(`Failed to send verification email to ${email}:`, emailError);
                 // Decide how to handle email failure
            }
        }

        // --- 10. Create JWT and Respond ---
        const payload = {
            user: {
                id: newUser.id // Use newUser.id (or newUser._id.toString())
            }
        };

        // Use environment variable for JWT secret and expire time
        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpire = process.env.JWT_EXPIRE || '1h'; // Default to 1 hour if not set

        if (!jwtSecret) {
            console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
            return res.status(500).send('Server configuration error');
        }

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: jwtExpire },
            (err, token) => {
                if (err) {
                     console.error("JWT Signing Error:", err);
                     // Avoid throwing error here, send response instead
                     return res.status(500).send('Error generating token');
                }
                res.status(201).json({ // Use 201 Created status
                    token,
                    verificationMethod: actualVerificationMethod,
                    msg: 'Registration successful. Please verify your account.'
                });
            }
        );

    } catch (err) {
        console.error("Registration Error:", err.message);
        console.error(err.stack); // Log stack for more details
        res.status(500).send('Server error during registration');
    }
});

// --- OTHER ROUTES (/verify-phone, /resend-verification, /me) ---
// These seem generally okay, but ensure CryptoAddress assignment logic is robust
// and handles cases where no addresses are available gracefully.

// @route   POST api/users/verify-phone
// @desc    Verify phone number with code
// @access  Private (Requires JWT)
router.post('/verify-phone', auth, async (req, res) => {
    const { verificationCode } = req.body;
    if (!verificationCode) {
        return res.status(400).json({ msg: 'Verification code is required' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.log(`Verify Phone: User not found for ID ${req.user.id}`);
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.isPhoneVerified) {
            console.log(`Verify Phone: Phone already verified for user ${user.username}`);
            return res.status(400).json({ msg: 'Phone number already verified' });
        }

        // Check code and expiry
        if (user.phoneVerificationCode !== verificationCode) {
            console.log(`Verify Phone: Invalid code provided for user ${user.username}`);
            return res.status(400).json({ msg: 'Invalid verification code' });
        }
        if (!user.phoneVerificationExpires || new Date() > user.phoneVerificationExpires) {
            console.log(`Verify Phone: Code expired for user ${user.username}`);
            return res.status(400).json({ msg: 'Verification code has expired' });
        }

        // --- Verification Success ---
        user.isPhoneVerified = true;
        user.phoneVerificationCode = undefined; // Use undefined to remove field
        user.phoneVerificationExpires = undefined; // Use undefined to remove field

        // --- Assign Crypto Addresses ---
        // IMPORTANT: This needs to be atomic or handle concurrency issues
        // If two users verify simultaneously, they might get the same address!
        // A more robust approach might involve locking or using transactions.
        console.log(`Assigning addresses for user ${user.username}`);
        const btcAddressDoc = await CryptoAddress.findOneAndUpdate(
            { type: 'BTC', isAssigned: false },
            { $set: { isAssigned: true, assignedTo: user._id, assignedAt: new Date() } },
            { new: true } // Return the updated document
        );

        const ethAddressDoc = await CryptoAddress.findOneAndUpdate(
            { type: 'ETH', isAssigned: false },
            { $set: { isAssigned: true, assignedTo: user._id, assignedAt: new Date() } },
            { new: true }
        );

        if (!btcAddressDoc || !ethAddressDoc) {
            console.error(`CRITICAL: Failed to assign addresses for user ${user.username}. BTC: ${!!btcAddressDoc}, ETH: ${!!ethAddressDoc}`);
            // Potential issue: Ran out of addresses, or concurrency problem.
            // Rollback verification? Notify admin?
            // For now, save user state but return error
            await user.save(); // Save verification status at least
            return res.status(500).json({ msg: 'Could not assign crypto addresses. Please contact support.' });
        }

        user.btcAddress = btcAddressDoc.address;
        user.ethAddress = ethAddressDoc.address;
        console.log(`Assigned BTC: ${user.btcAddress}, ETH: ${user.ethAddress} to user ${user.username}`);

        // Save the user with the addresses and updated verification status
        await user.save();

        // Exclude sensitive fields from the response
        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.phoneVerificationCode;
        delete userResponse.phoneVerificationExpires;
        delete userResponse.emailVerificationCode;
        delete userResponse.emailVerificationExpires;

        res.json({ msg: 'Phone number verified successfully and addresses assigned.', user: userResponse });

    } catch (err) {
        console.error("Verify Phone Error:", err.message);
        console.error(err.stack);
        res.status(500).send('Server error during phone verification');
    }
});


// @route   POST api/users/resend-verification
// @desc    Resend verification code (Assumes phone verification for now)
// @access  Private
router.post('/resend-verification', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Adapt this if you support resending email verification too
    if (user.verificationMethod !== 'phone' || !user.phoneNumber) {
        return res.status(400).json({ msg: 'Cannot resend phone verification for this account.' });
    }

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
    try {
        await sendVerificationSMS(user.phoneNumber, verificationCode);
        console.log(`Resent verification SMS to ${user.phoneNumber}`);
        res.json({ msg: 'Verification code sent successfully' });
    } catch (smsError) {
        console.error(`Failed to resend verification SMS to ${user.phoneNumber}:`, smsError);
        res.status(500).json({ msg: 'Failed to send verification code. Please try again later.'})
    }

  } catch (err) {
    console.error("Resend Verification Error:", err.message);
    console.error(err.stack);
    res.status(500).send('Server error');
  }
});


// @route   GET api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    // Select fields to EXCLUDE using '-' prefix
    const user = await User.findById(req.user.id)
      .select('-password -phoneVerificationCode -phoneVerificationExpires -emailVerificationCode -emailVerificationExpires'); // Exclude sensitive fields

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error("Get User Error:", err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;