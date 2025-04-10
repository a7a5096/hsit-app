// backend/server.js

// --- 1. Requires ---
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Configure dotenv ONCE, early
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db'); // Assuming this file exists

// --- 2. Initialization ---
const app = express();

// --- 3. CORS Configuration (Apply ONCE) ---
// Update this with your actual Render frontend URL!
const allowedOrigins = [
    process.env.CORS_ALLOWED_ORIGINS || 'https://hsit-app.onrender.com', // Use env var
    'http://localhost:8000', // Keep for local dev if needed
    'http://localhost:5500', // Add any other local dev ports
    'http://127.0.0.1:5500' // Add this too for local dev sometimes
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); // Apply specific CORS options ONCE

// --- 4. Middleware (Apply ONCE each) ---
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Optional Debug Middleware (keep if helpful)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  // Avoid logging full headers in production unless necessary for debugging
  // console.log('Debug - Request Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// --- 5. Static File Serving (Setup before API routes if possible) ---
// Create public directories if they don't exist (Run this logic only once on startup)
const publicDir = path.join(__dirname, '../public');
const qrCodeDir = path.join(publicDir, 'qrcodes');
if (!fs.existsSync(qrCodeDir)) {
  fs.mkdirSync(qrCodeDir, { recursive: true });
  console.log(`Created directory: ${qrCodeDir}`);
} else {
  console.log(`Directory exists: ${qrCodeDir}`);
}

// Serve static files from specific paths first
app.use('/qrcodes', express.static(qrCodeDir));
// If you have other top-level static assets like CSS/JS in /public
// app.use(express.static(publicDir)); // Uncomment if needed


// --- 6. API Routes ---
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/crypto', require('./routes/crypto'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/invitations', require('./routes/invitations'));
// Add other API routes here...


// --- 7. Frontend Serving / Catch-all (for Single Page Apps) ---
// Serve index.html for non-API GET requests (useful for SPA routing)
// Make sure this comes AFTER your API routes and static file serving
app.get('*', (req, res, next) => {
    // If the request is not for an API endpoint, serve the main HTML file
    if (!req.path.startsWith('/api/') && req.method === 'GET') {
        res.sendFile(path.resolve(__dirname, '..', 'index.html')); // Adjust path if frontend files are elsewhere
    } else {
        next(); // Pass control to the next middleware (error handler or 404)
    }
});


// --- 8. Error Handling Middleware (Must be last `app.use`) ---
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});


// --- 9. Database Connection & Server Start ---
const PORT = process.env.PORT || 5000; // Define PORT ONCE

// Connect to DB and then start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running successfully on port ${PORT}`);
        console.log(`Allowed Origins: ${allowedOrigins.join(', ')}`);
        // console.log(`Access the application locally (if applicable) at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1); // Exit if DB connection fails
});