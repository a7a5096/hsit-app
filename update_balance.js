// Script to update user balance in the HSIT app database
// This script updates the UBT balance for a specific user by email

// Import required modules
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize dotenv
dotenv.config();

// Connect to MongoDB
async function connectToDatabase() {
  try {
    // MongoDB connection string - using the production connection string
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://a7a5096:MM00nngg2@cluster0hsit.xelat83.mongodb.net/hsit_app?retryWrites=true&w=majority&appName=Cluster0HSIT';
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    return false;
  }
}

// Define User schema to match the one in the application
const UserSchema = new mongoose.Schema({
  email: String,
  balances: {
    ubt: {
      type: Number,
      default: 0
    }
  }
});

// Create User model
const User = mongoose.model('User', UserSchema);

// Function to update user balance
async function updateUserBalance(email, newBalance) {
  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      return false;
    }
    
    // Get current balance for logging
    const currentBalance = user.balances?.ubt || 0;
    
    // Update the user's UBT balance
    const result = await User.updateOne(
      { email },
      { $set: { 'balances.ubt': newBalance } }
    );
    
    if (result.modifiedCount === 1) {
      console.log(`Successfully updated balance for ${email}`);
      console.log(`Previous balance: ${currentBalance} UBT`);
      console.log(`New balance: ${newBalance} UBT`);
      return true;
    } else {
      console.error('Balance update failed or no changes were made');
      return false;
    }
  } catch (error) {
    console.error('Error updating user balance:', error);
    return false;
  }
}

// Main function
async function main() {
  // User email and new balance from command line arguments
  const email = process.argv[2] || '2family4jeff@gmail.com';
  const newBalance = parseFloat(process.argv[3] || '105');
  
  if (isNaN(newBalance)) {
    console.error('Invalid balance amount. Please provide a valid number.');
    process.exit(1);
  }
  
  console.log(`Attempting to update balance for ${email} to ${newBalance} UBT`);
  
  // Connect to database
  const connected = await connectToDatabase();
  if (!connected) {
    process.exit(1);
  }
  
  // Update user balance
  const updated = await updateUserBalance(email, newBalance);
  
  // Disconnect from database
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
  
  // Exit with appropriate code
  process.exit(updated ? 0 : 1);
}

// Run the script
main();
