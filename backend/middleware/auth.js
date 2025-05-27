import * as jose from "jose";
import dotenv from "dotenv";

dotenv.config(); // Ensure environment variables are loaded

// JWT Secret for token verification - must be a Uint8Array for jose
const JWT_SECRET_STRING = process.env.JWT_SECRET || "hsit-secret-key";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

/**
 * Middleware to authenticate JWT token using jose
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = async (req, res, next) => {
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  // Verify token using jose
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    // FIXED: Handle both token formats to ensure compatibility
    // If payload contains 'id' directly (from jsonwebtoken), use that
    // If payload contains 'user' object (from jose), use that
    if (payload.id) {
      req.user = { 
        id: payload.id,
        username: payload.username // Include username to maintain compatibility
      };
    } else if (payload.user) {
      req.user = payload.user;
    } else {
      // If neither format is found, token is invalid
      return res.status(401).json({ msg: "Token payload is invalid" });
    }
    
    next();
  } catch (err) {
    console.error("Auth Middleware - Token verification failed:", err.message); // Log the error
    if (err.code === "ERR_JWT_EXPIRED") {
        return res.status(401).json({ msg: "Token is expired" });
    } else if (err.code === "ERR_JWS_INVALID" || err.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED" || err.code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
        return res.status(401).json({ msg: "Token is not valid" });
    }
    // For other errors, send a generic 500 or a more specific 401 if appropriate
    res.status(401).json({ msg: "Token is not valid" }); 
  }
};

export default authMiddleware; // Changed to ES6 export to match routes/auth.js style
