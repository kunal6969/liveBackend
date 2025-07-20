const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware - Starting authentication check');
    console.log('🔐 Auth middleware - Request path:', req.path);
    console.log('🔐 Auth middleware - Request method:', req.method);
    
    // Get token from cookie
    const token = req.cookies.authToken;
    console.log('🔐 Auth middleware - Token present:', !!token);

    if (!token) {
      console.log('❌ Auth middleware - No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Auth middleware - Token decoded, userId:', decoded.userId);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    console.log('🔐 Auth middleware - User found:', !!user);
    
    if (!user) {
      console.log('❌ Auth middleware - User not found in database');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Attach user to request object
    req.user = user;
    console.log('✅ Auth middleware - Authentication successful for user:', user.email);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message, error.name);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    console.log('🔓 Optional auth middleware - Starting check');
    const token = req.cookies.authToken;
    console.log('🔓 Optional auth middleware - Token present:', !!token);

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      console.log('🔓 Optional auth middleware - User found:', !!user);
      
      if (user) {
        req.user = user;
        console.log('✅ Optional auth middleware - User attached:', user.email);
      }
    } else {
      console.log('🔓 Optional auth middleware - No token, proceeding without auth');
    }
    
    next();
  } catch (error) {
    console.log('⚠️ Optional auth middleware - Auth failed, proceeding without user:', error.message);
    // Don't fail on optional auth errors, just proceed without user
    next();
  }
};

module.exports = { authenticateToken, optionalAuth };
