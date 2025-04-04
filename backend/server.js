// Script to run the backend server
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Create public directories if they don't exist
const publicDir = path.join(__dirname, '../public');
const qrCodeDir = path.join(publicDir, 'qrcodes');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (!fs.existsSync(qrCodeDir)) {
  fs.mkdirSync(qrCodeDir, { recursive: true });
}

// Initialize Express
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Define Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/crypto', require('./routes/crypto'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/email-verification', require('./routes/email-verification'));

// Serve static assets
app.use(express.static(path.join(__dirname, '../')));

// Serve public directory for QR codes
app.use(express.static(path.join(__dirname, '../public')));

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});
