#!/bin/bash

# Script to convert and import ETH addresses from the provided JSON file
# This script handles the RTF formatting in the provided file

# Set the input and output file paths
INPUT_FILE="/home/ubuntu/upload/eth(2).json"
CLEAN_JSON_FILE="/home/ubuntu/eth_addresses_clean.json"

# Extract the JSON content from the RTF file
# This removes RTF formatting and keeps only the JSON content
cat "$INPUT_FILE" | sed 's/\\f0\\fs24 \\cf0 //g' | sed 's/\\//g' > "$CLEAN_JSON_FILE"

# Run the import script with the cleaned JSON file
echo "Running ETH address import with cleaned JSON file..."
cd /home/ubuntu/hsit-app
node backend/scripts/importEthAddressesCli.js "$CLEAN_JSON_FILE"

echo "Import process completed."
