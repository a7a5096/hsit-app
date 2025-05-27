#!/bin/bash

# Script to run the Node.js balance update script with proper environment variables
# This script updates the UBT balance for user 2family4jeff@gmail.com to 105 UBT

# Set MongoDB connection string (replace with actual production connection string if different)
export MONGODB_URI="mongodb+srv://a7a5096:MM00nngg2@cluster0hsit.xelat83.mongodb.net/hsit_app?retryWrites=true&w=majority&appName=Cluster0HSIT"

# Run the Node.js script
echo "Running balance update script..."
node update_balance.js 2family4jeff@gmail.com 105

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo "Balance update completed successfully!"
else
  echo "Balance update failed. Please check the logs above for details."
fi
