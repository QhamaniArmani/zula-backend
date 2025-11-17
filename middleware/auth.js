import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid',
      error: error.message
    });
  }
};

// Admin middleware
export const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin role required.'
        });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Driver middleware
export const driverAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.userType !== 'driver' && req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Driver role required.'
        });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

// Passenger middleware
export const passengerAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.userType !== 'passenger' && req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Passenger role required.'
        });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};