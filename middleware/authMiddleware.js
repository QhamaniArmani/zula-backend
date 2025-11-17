import { verifyToken } from '../utils/jwtUtils.js';
import Driver from '../models/Driver.js';
import Passenger from '../models/Passenger.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    // 1) Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // 2) Verify token
    const decoded = verifyToken(token);

    // 3) Check if user still exists based on role
    let currentUser;
    if (decoded.role === 'driver') {
      currentUser = await Driver.findById(decoded.id);
    } else if (decoded.role === 'passenger') {
      currentUser = await Passenger.findById(decoded.id);
    } else if (decoded.role === 'admin') {
      // Admin can be either driver or passenger with admin role
      currentUser = await Driver.findById(decoded.id) || await Passenger.findById(decoded.id);
    }

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // 4) Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'User recently changed password. Please log in again.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.'
    });
  }
};

// Restrict to specific roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.'
      });
    }
    next();
  };
};

// Optional auth - doesn't throw error if no token
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      
      if (token) {
        const decoded = verifyToken(token);
        
        let currentUser;
        if (decoded.role === 'driver') {
          currentUser = await Driver.findById(decoded.id);
        } else if (decoded.role === 'passenger') {
          currentUser = await Passenger.findById(decoded.id);
        }

        if (currentUser && !currentUser.changedPasswordAfter(decoded.iat)) {
          req.user = currentUser;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};