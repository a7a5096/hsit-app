// Script to run the backend server
// In your backend/server.js (or equivalent)

const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Make sure dotenv is configured early

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
    'https://your-frontend-domain.com', // Your actual frontend domain
    'http://localhost:8000' // Or whatever port you use for local frontend dev
    // Add any other origins you need to allow
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // If you need to send cookies or authorization headers
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
// --- End CORS Configuration ---


// Middleware for parsing JSON bodies
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); // For form data if needed


// --- Your API Routes ---
// Example:
// const authRoutes = require('./routes/authRoutes');
// app.use('/api/auth', authRoutes); 
// ... other routes ...


// --- Start the server ---
const PORT = process.env.PORT || 3000; // Render provides the PORT env var
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Connect to MongoDB here
});

require('dotenv').config();
const connectDB = require('./config/db');
const path = require('path');
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