import cors from 'cors';

/**
 * Enhanced CORS middleware with proper error handling for WebKit browsers
 * This middleware addresses the "Load failed" error in WebKit-based browsers
 * by ensuring proper CORS headers and preflight handling
 */
const corsMiddleware = () => {
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // List of allowed origins - include both production and development URLs
      const allowedOrigins = [
        'https://hsitapp.link',
        'https://www.hsitapp.link',
        'http://localhost:3000',
        'http://localhost:5000',
        'https://hsit-app.vercel.app'
      ];
      
      // Check if the origin is allowed
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins in current implementation
      }
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept, x-auth-token, Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
    exposedHeaders: "Content-Type, Authorization, Access-Control-Allow-Origin, Access-Control-Allow-Credentials",
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  // Return the configured CORS middleware
  return cors(corsOptions);
};

export default corsMiddleware;
