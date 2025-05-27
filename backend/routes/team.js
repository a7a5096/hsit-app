import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * @route   GET api/team/data
 * @desc    Get user's team data including direct invites, second-level invites, and bonus information
 * @access  Private
 */
router.get('/data', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Get direct invites (users who were invited by this user)
    const directInvites = await User.find({ invitedBy: user._id })
      .select('username createdAt isPhoneVerified isActive botsPurchased');

    // Get second-level invites (users invited by direct invites)
    const secondLevelInvites = [];
    for (const invite of directInvites) {
      const secondaryInvites = await User.find({ invitedBy: invite._id })
        .select('username createdAt isPhoneVerified isActive botsPurchased');
      
      secondLevelInvites.push(...secondaryInvites);
    }

    // Calculate bonus information
    // This would typically come from the user model or a separate calculation
    const ubtBonusEarned = user.ubtBonusEarned || 0;
    
    // Count qualified invites (users who have purchased bots)
    const qualifiedInvites = directInvites.filter(invite => 
      invite.botsPurchased && invite.botsPurchased > 0
    ).length;

    // Process invites to match frontend expectations
    const processedDirectInvites = directInvites.map(invite => ({
      username: invite.username,
      createdAt: invite.createdAt,
      isActive: invite.isActive || invite.isPhoneVerified,
      isVerified: invite.isPhoneVerified,
      bonusEarned: 10 * (invite.botsPurchased || 0) // 10 UBT per bot purchased
    }));

    const processedSecondLevelInvites = secondLevelInvites.map(invite => ({
      username: invite.username,
      createdAt: invite.createdAt,
      isActive: invite.isActive || invite.isPhoneVerified,
      isVerified: invite.isPhoneVerified,
      bonusEarned: 15 * (invite.botsPurchased || 0) // 15 UBT per bot purchased
    }));

    res.json({
      success: true,
      directInvites: processedDirectInvites,
      secondLevelInvites: processedSecondLevelInvites,
      ubtBonusEarned,
      qualifiedInvites
    });
  } catch (err) {
    console.error('Error fetching team data:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching team data',
      error: process.env.NODE_ENV === 'production' ? null : err.message
    });
  }
});

export default router;
