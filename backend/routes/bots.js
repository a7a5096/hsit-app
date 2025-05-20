import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Bot definitions - in production this would likely come from a database
const bots = [
  { id: 1, name: "Starter Bot", cost: 100, description: "Entry-level trading bot" },
  { id: 2, name: "Standard Bot", cost: 300, description: "Standard trading bot with more features" },
  { id: 3, name: "Premium Bot", cost: 500, description: "Premium trading bot with advanced features" },
  { id: 4, name: "Pro Bot", cost: 1000, description: "Professional trading bot with all features" },
  { id: 5, name: "Elite Bot", cost: 5000, description: "Elite VIP trading bot with personalized service" }
];

// Helper function to get bot by ID
function getBotById(id) {
  return bots.find(bot => bot.id === parseInt(id));
}

// @route   GET api/bots
// @desc    Get all available bots
// @access  Public
router.get('/', async (req, res) => {
  try {
    res.json(bots);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/bots/:id
// @desc    Get bot by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const bot = getBotById(req.params.id);
    if (!bot) {
      return res.status(404).json({ msg: 'Bot not found' });
    }
    res.json(bot);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/bots/purchase
// @desc    Purchase a bot
// @access  Private
router.post('/purchase', auth, async (req, res) => {
  const { botId } = req.body;
  
  try {
    // Get bot details (price, etc.)
    const bot = getBotById(botId);
    if (!bot) {
      return res.status(404).json({ msg: 'Bot not found' });
    }
    
    // Get user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Check if user has enough UBT
    if (user.balances.ubt < bot.cost) {
      return res.status(400).json({ msg: 'Insufficient Un-Buyable Token balance' });
    }
    
    // Deduct UBT from user balance
    user.balances.ubt -= bot.cost;
    
    // Add bot to user's purchased bots
    if (!user.botsPurchased.includes(botId.toString())) {
      user.botsPurchased.push(botId.toString());
    }
    
    // Create transaction record
    const transaction = new Transaction({
      user: req.user.id,
      type: 'purchase',
      currency: 'UBT',
      amount: -bot.cost,
      status: 'completed',
      description: `Purchased ${bot.name} bot`
    });
    
    await transaction.save();
    await user.save();
    
    res.json({
      msg: 'Bot purchased successfully',
      bot: botId,
      transaction,
      newBalance: user.balances.ubt
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;
