/**
 * Script to parse cryptocurrency addresses from CSV files
 * and prepare them for assignment to users
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to CSV files
const bitcoinCsvPath = '/home/ubuntu/upload/bitcoin.csv';
const ethereumCsvPath = '/home/ubuntu/upload/ethereum.csv';
const usdtCsvPath = '/home/ubuntu/upload/usdt.csv';

// Arrays to store addresses
let bitcoinAddresses = [];
let ethereumAddresses = [];
let usdtAddresses = [];

// Function to read addresses from CSV file
async function readAddressesFromCsv(filePath) {
  const addresses = [];
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    // Skip empty lines
    if (line.trim()) {
      addresses.push(line.trim());
    }
  }
  
  return addresses;
}

// Function to check for duplicate addresses
function checkForDuplicates(addresses, type) {
  const uniqueAddresses = new Set(addresses);
  
  if (uniqueAddresses.size !== addresses.length) {
    console.log(`Warning: Found ${addresses.length - uniqueAddresses.size} duplicate ${type} addresses`);
    return Array.from(uniqueAddresses);
  }
  
  return addresses;
}

// Main function to parse all address files
async function parseAllAddresses() {
  try {
    // Read addresses from CSV files
    bitcoinAddresses = await readAddressesFromCsv(bitcoinCsvPath);
    ethereumAddresses = await readAddressesFromCsv(ethereumCsvPath);
    usdtAddresses = await readAddressesFromCsv(usdtCsvPath);
    
    // Check for duplicates and remove them
    bitcoinAddresses = checkForDuplicates(bitcoinAddresses, 'Bitcoin');
    ethereumAddresses = checkForDuplicates(ethereumAddresses, 'Ethereum');
    usdtAddresses = checkForDuplicates(usdtAddresses, 'USDT');
    
    // Log summary
    console.log(`Parsed ${bitcoinAddresses.length} unique Bitcoin addresses`);
    console.log(`Parsed ${ethereumAddresses.length} unique Ethereum addresses`);
    console.log(`Parsed ${usdtAddresses.length} unique USDT addresses`);
    
    // Save parsed addresses to JSON file for later use
    const addressData = {
      bitcoin: bitcoinAddresses,
      ethereum: ethereumAddresses,
      usdt: usdtAddresses
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'parsed_addresses.json'),
      JSON.stringify(addressData, null, 2)
    );
    
    console.log('Addresses parsed and saved to parsed_addresses.json');
    return addressData;
  } catch (error) {
    console.error('Error parsing address files:', error);
    throw error;
  }
}

// Execute the parsing
parseAllAddresses()
  .then(() => console.log('Address parsing completed successfully'))
  .catch(err => console.error('Failed to parse addresses:', err));
