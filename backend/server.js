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

// Debug middleware to log route information
app.use((req, res, next) => {
  console.log('Debug - Request URL:', req.url);
  console.log('Debug - Request Method:', req.method);
  console.log('Debug - Request Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// Serve static assets first to avoid route conflicts
app.use('/qrcodes', express.static(path.join(__dirname, '../public/qrcodes')));
app.use(express.static(path.join(__dirname, '../public')));

// Define Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/crypto', require('./routes/crypto'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/invitations', require('./routes/invitations'));

// Create the email-verification route properly - remove it if you've moved these routes elsewhere
// app.use('/api/email-verification', require('./routes/email-verification'));

// Specific routes for static files
app.get('/index.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'index.html'));
});

// Safer catch-all route that doesn't use the wildcard
app.use((req, res, next) => {
  if (req.method === 'GET') {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ msg: 'API endpoint not found' });
    }
    return res.sendFile(path.resolve(__dirname, '..', 'index.html'));
  }
  next();
});

// Error handler middleware - must be after all routes
app.use((err, req, res, next) => {
  console.error('Error in route processing:');
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});