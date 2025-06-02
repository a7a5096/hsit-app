// CLI script to run the ETH address import
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import importEthAddresses from './importEthAddresses.js';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if file path is provided
if (process.argv.length < 3) {
  console.error('Usage: node importEthAddressesCli.js <path-to-json-file>');
  process.exit(1);
}

const filePath = process.argv[2];

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

console.log(`Importing ETH addresses from ${filePath}...`);

// Run the import function
importEthAddresses(filePath)
  .then(() => {
    console.log('Import process completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Import process failed:', error);
    process.exit(1);
  });
