import express from 'express';
import BannerAsset from '../models/BannerAsset.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all banner assets
router.get('/', async (req, res) => {
  try {
    const bannerAssets = await BannerAsset.find();
    res.json(bannerAssets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get banner assets by page
router.get('/page/:page', async (req, res) => {
  try {
    const bannerAssets = await BannerAsset.find({ 
      page: req.params.page,
      active: true 
    }).sort({ zIndex: 1 });
    res.json(bannerAssets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new banner asset (admin only)
router.post('/', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const bannerAsset = new BannerAsset({
    name: req.body.name,
    type: req.body.type,
    path: req.body.path,
    page: req.body.page,
    active: req.body.active,
    zIndex: req.body.zIndex
  });

  try {
    const newBannerAsset = await bannerAsset.save();
    res.status(201).json(newBannerAsset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a banner asset (admin only)
router.patch('/:id', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const bannerAsset = await BannerAsset.findById(req.params.id);
    if (!bannerAsset) {
      return res.status(404).json({ message: 'Banner asset not found' });
    }

    if (req.body.name) bannerAsset.name = req.body.name;
    if (req.body.type) bannerAsset.type = req.body.type;
    if (req.body.path) bannerAsset.path = req.body.path;
    if (req.body.page) bannerAsset.page = req.body.page;
    if (req.body.active !== undefined) bannerAsset.active = req.body.active;
    if (req.body.zIndex !== undefined) bannerAsset.zIndex = req.body.zIndex;

    const updatedBannerAsset = await bannerAsset.save();
    res.json(updatedBannerAsset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a banner asset (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const bannerAsset = await BannerAsset.findById(req.params.id);
    if (!bannerAsset) {
      return res.status(404).json({ message: 'Banner asset not found' });
    }

    await bannerAsset.remove();
    res.json({ message: 'Banner asset deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
