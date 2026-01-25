import cors from 'cors';

/**
 * Enhanced CORS middleware with proper security configuration
 * Only allows requests from trusted origins
 */
const corsMiddleware = () => {
  // List of allowed origins - include both production and development URLs
  const allowedOrigins = [
    'https://hsitapp.link',
    'https://www.hsitapp.link',
    'https://hsit-app.vercel.app',
    'https://hsit-app.onrender.com',
    'https://botcitadel.com',
    'https://www.botcitadel.com'
  ];

  // Add localhost origins only in development
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://localhost:5000');
    allowedOrigins.push('http://127.0.0.1:3000');
    allowedOrigins.push('http://127.0.0.1:5000');
  }

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests, same-origin)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'x-auth-token',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'Cache-Control'
    ],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  // Return the configured CORS middleware
  return cors(corsOptions);
};

export default corsMiddleware;
