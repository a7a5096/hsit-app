// Script to seed initial banner assets into the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BannerAsset from '../models/BannerAsset.js';
import connectDB from '../config/db.js';

// Load environment variables
dotenv.config();

// Initial banner assets data
const initialBannerAssets = [
  {
    name: 'Dashboard Background GIF',
    type: 'background',
    path: 'images/IMG_6204.gif',
    page: 'dashboard',
    active: true,
    zIndex: 1
  },
  {
    name: 'Dashboard Banner Overlay',
    type: 'foreground',
    path: 'banner.png',
    page: 'dashboard',
    active: true,
    zIndex: 2
  }
];

// Connect to database and seed data
const seedBannerAssets = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');
    
    // Check if banner assets already exist
    const existingAssets = await BannerAsset.find();
    
    if (existingAssets.length > 0) {
      console.log('Banner assets already exist in database. Skipping seed.');
      process.exit(0);
    }
    
    // Insert initial banner assets
    await BannerAsset.insertMany(initialBannerAssets);
    console.log('Banner assets seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding banner assets:', error);
    process.exit(1);
  }
};

// Run the seed function
seedBannerAssets();
