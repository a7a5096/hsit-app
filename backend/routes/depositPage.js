import express from 'express';
import auth from '../middleware/auth.js';
import addressAssignmentService from '../services/addressAssignmentService.js';

const router = express.Router();

// @route   GET /deposit
// @desc    Server-side rendered deposit page with cryptocurrency addresses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Get addresses from the service
    const addresses = await addressAssignmentService.getUserAddresses(req.user.id);
    
    if (!addresses.BTC || !addresses.ETH || !addresses.USDT) {
      return res.status(400).send('Cryptocurrency addresses not assigned to your account. Please contact support.');
    }
    
    // Render the deposit page with the user's cryptocurrency addresses
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Cryptocurrency Deposit Addresses</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #1a1a2e;
            color: #e6e6e6;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          header {
            background-color: #16213e;
            padding: 15px 20px;
            display: flex;
            align-items: center;
          }
          .back-button {
            color: #a362ff;
            text-decoration: none;
            font-size: 18px;
            margin-right: 15px;
          }
          h1 {
            text-align: center;
            margin: 30px 0;
            color: #ffffff;
          }
          .subtitle {
            text-align: center;
            color: #cccccc;
            margin-bottom: 40px;
          }
          .address-card {
            background-color: #242444;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .crypto-name {
            font-size: 22px;
            margin-bottom: 15px;
            color: #a362ff;
          }
          .address-container {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
          }
          .address-box {
            flex-grow: 1;
            background-color: #2c2c54;
            border: 1px solid #444466;
            border-radius: 5px;
            padding: 12px;
            font-family: monospace;
            font-size: 14px;
            color: #ffffff;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .copy-btn {
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 12px 20px;
            margin-left: 10px;
            cursor: pointer;
            font-weight: bold;
          }
          .warning {
            color: #ff9800;
            font-size: 14px;
            margin-top: 10px;
          }
          .close-btn {
            display: block;
            width: 200px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 5px;
            padding: 12px 20px;
            margin: 30px auto;
            cursor: pointer;
            font-weight: bold;
            text-align: center;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <header>
          <a href="/dashboard" class="back-button">← Back</a>
          <h2>Deposit Funds</h2>
        </header>
        
        <div class="container">
          <h1>Your Crypto Deposit Addresses</h1>
          <p class="subtitle">These addresses are uniquely assigned to your account. Send your crypto to these addresses:</p>
          
          <div class="address-card">
            <div class="crypto-name">Bitcoin (BTC)</div>
            <div class="address-container">
              <div class="address-box" id="btc-address">${addresses.BTC}</div>
              <button class="copy-btn" onclick="copyAddress('btc-address')">Copy</button>
            </div>
            <p class="warning">⚠️ Send only Bitcoin (BTC) to this address. Sending any other coin may result in permanent loss.</p>
          </div>
          
          <div class="address-card">
            <div class="crypto-name">Ethereum (ETH)</div>
            <div class="address-container">
              <div class="address-box" id="eth-address">${addresses.ETH}</div>
              <button class="copy-btn" onclick="copyAddress('eth-address')">Copy</button>
            </div>
            <p class="warning">⚠️ Send only Ethereum (ETH) to this address. Sending any other coin may result in permanent loss.</p>
          </div>
          
          <div class="address-card">
            <div class="crypto-name">USDT (ERC20)</div>
            <div class="address-container">
              <div class="address-box" id="usdt-address">${addresses.USDT}</div>
              <button class="copy-btn" onclick="copyAddress('usdt-address')">Copy</button>
            </div>
            <p class="warning">⚠️ Send only Tether (USDT - ERC20) to this address. Sending any other coin may result in permanent loss.</p>
          </div>
          
          <a href="/dashboard" class="close-btn">Close</a>
        </div>
        
        <script>
          function copyAddress(elementId) {
            const addressElement = document.getElementById(elementId);
            const text = addressElement.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
              const button = addressElement.nextElementSibling;
              const originalText = button.textContent;
              button.textContent = 'Copied!';
              setTimeout(() => {
                button.textContent = originalText;
              }, 2000);
            }).catch(err => {
              console.error('Failed to copy: ', err);
              alert('Failed to copy address. Please copy it manually.');
            });
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;
