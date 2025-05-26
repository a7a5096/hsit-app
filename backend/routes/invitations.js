import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import { generateInvitationCode } from '../utils/helpers.js';

const router = express.Router();

// @route   GET api/invitations
// @desc    Get user's invitation code
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get invitation details
    const invitation = await Invitation.findOne({ 
      createdBy: user._id,
      isUsed: false
    });

    if (!invitation) {
      // Create a new invitation if none exists
      const newCode = generateInvitationCode();
      const newInvitation = new Invitation({
        code: newCode,
        createdBy: user._id
      });
      await newInvitation.save();

      // Update user's invitation code
      user.invitationCode = newCode;
      await user.save();

      return res.json({ invitationCode: newCode });
    }

    res.json({ invitationCode: invitation.code });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/invitations/generate
// @desc    Generate a new invitation code
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Generate new code
    const newCode = generateInvitationCode();
    
    // Create new invitation
    const newInvitation = new Invitation({
      code: newCode,
      createdBy: user._id
    });
    await newInvitation.save();

    // Update user's invitation code
    user.invitationCode = newCode;
    await user.save();

    res.json({ invitationCode: newCode });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/invitations/team
// @desc    Get user's team (invited users)
// @access  Private
router.get('/team', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get direct invites
    const directInvites = await User.find({ invitedBy: user._id })
      .select('username createdAt isPhoneVerified botsPurchased');

    // Get second-level invites
    const secondLevelInvites = [];
    for (const invite of directInvites) {
      const secondaryInvites = await User.find({ invitedBy: invite._id })
        .select('username createdAt isPhoneVerified botsPurchased');
      
      secondLevelInvites.push(...secondaryInvites);
    }

    res.json({
      directInvites,
      secondLevelInvites,
      totalDirectInvites: directInvites.length,
      totalSecondLevelInvites: secondLevelInvites.length,
      ubtBonusEarned: user.ubtBonusEarned,
      qualifiedInvites: user.qualifiedInvites
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/invitations/validate/:code
// @desc    Validate an invitation code
// @access  Public
router.get('/validate/:code', async (req, res) => {
  const { code } = req.params;
  
  try {
    const invitation = await Invitation.findOne({ 
      code,
      isUsed: false
    });

    if (!invitation) {
      return res.status(400).json({ valid: false, msg: 'Invalid or already used invitation code' });
    }

    const inviter = await User.findById(invitation.createdBy)
      .select('username');

    if (!inviter) {
      return res.status(400).json({ valid: false, msg: 'Inviter not found' });
    }

    res.json({
      valid: true,
      inviterUsername: inviter.username
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;
