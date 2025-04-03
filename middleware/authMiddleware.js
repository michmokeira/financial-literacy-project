const jwt = require('jsonwebtoken'); // Import JWT library
const User = require('../models/user'); // Import the User model

// Middleware to authenticate users using JWT
const authenticate = async (req, res, next) => {
  const token = req.header('Authorization');// Get token from request header
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });// If no token, deny access

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user data (id, role) to request
    next();
  } // If token is valid, proceed to next middleware
    catch (error) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Middleware to authorize admin users
const authorizeAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);// Find user by ID from the request
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }// If user is not found or not an admin, deny access

    next();
  } // If user is admin, proceed to next middleware
    catch (error) {
    res.status(500).json({ message: 'Server error' });
  }// Handle any server errors
};

  // Protects routes by checking if the user is logged in
  const ensureAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect('/login');
    }
    next();
};

module.exports = { authenticate, authorizeAdmin, ensureAuthenticated };// Export the middleware functions for use in other files