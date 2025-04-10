import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// --- ES Module equivalent for __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- End ES Module equivalent ---

const app = express();

// Middleware
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : [];
// This log should appear ONCE when the backend server starts in Render logs
console.log("Initializing CORS with allowed origins:", allowedOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        // Check if the request origin is in the allowed list OR if there's no origin
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true); // Allow the request
        } else {
            // Log an error if the origin is not allowed. Check Render logs for this.
            console.error(`CORS Error: Origin ${origin} not allowed. Allowed list: ${allowedOrigins}`);
            callback(new Error('Not allowed by CORS')); // Disallow the request
        }
    },
    credentials: true, // <-- MUST BE TRUE
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept",
    optionsSuccessStatus: 200
};

// Apply CORS middleware BEFORE your API routes
app.use(cors(corsOptions));

// Optional: Explicitly handle preflight requests (usually handled by above, but good for debug)
// app.options('*', cors(corsOptions));

app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// --- Your API routes defined AFTER cors middleware ---
// Example: app.use('/api/users', userRoutes);
// --- Serve Static Files (can be before or after API routes, usually after) ---
app.use(express.static(path.join(__dirname, '../frontend/build')));
// --- Catchall Handler (should be LAST) ---
app.get('*', (req, res) => { /* ... send index.html ... */ });app.use(express.json()); // Used to parse JSON bodies
// app.use(express.urlencoded({ extended: true })); // Uncomment if you need to parse URL-encoded bodies

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Basic API Route (Example)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// --- Add your other API routes here ---
// Example:
// import itemRoutes from './routes/items.js'; // Use .js extension if importing local files in ESM
// app.use('/api/items', itemRoutes);
// Make sure any files you import (like './routes/items.js') ALSO use ES Module syntax (import/export)

// Catchall handler: For any request that doesn't match an API route or static file,
// send back React's index.html file. This is important for client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/build', 'index.html'), (err) => {
    if (err) {
      // Avoid sending the HTML file if there's an error finding it,
      // maybe the frontend wasn't built correctly.
      res.status(500).send(err);
    }
  });
});


// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI; // Ensure this matches the key in Render Env Vars
const PORT = process.env.PORT || 5000;

if (!MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI environment variable is not defined.");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message); // Log only the error message initially for clarity
    // console.error(err); // Uncomment for full error stack trace if needed
    process.exit(1);
  });

// Optional: Graceful shutdown
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing MongoDB connection');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing MongoDB connection');
    mongoose.connection.close(() => {
        console.log('MongoDB connection closed due to app termination');
        process.exit(0);
    });
});
