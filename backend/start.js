// Script to run the import addresses script and start the server
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log('Starting the application...');

// Start the server directly - addresses are now managed in the database
console.log('Starting the server...');
const serverProcess = spawn('node', [path.join(__dirname, 'server.js')]);

serverProcess.stdout.on('data', (data) => {
  console.log(`Server: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`Server error: ${data}`);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});
