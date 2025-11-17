// controllers/userController.js
import User from '../models/User.js';

export const userController = {
  // Get user profile
  async getUserProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile',
        error: error.message
      });
    }
  },

  // Update user profile
  async updateUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, phone, profilePicture, preferences } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(profilePicture && { profilePicture }),
            ...(preferences && { preferences })
          }
        },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  },

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;

      // You can add more statistics based on user type
      const stats = {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalSpent: 0,
        averageRating: 0
      };

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics',
        error: error.message
      });
    }
  }
};