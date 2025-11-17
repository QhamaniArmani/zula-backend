// controllers/ratingController.js
import Rating from '../models/Rating.js';
import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';
import Passenger from '../models/Passenger.js';

class RatingController {
  
  // Submit a rating for a completed ride
  async submitRating(req, res) {
    try {
      const { rideId } = req.params;
      const { rating, review, categories } = req.body;
      const ratingUser = req.user; // From auth middleware
      
      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      
      // Find the ride
      const ride = await Ride.findById(rideId)
        .populate('driverId', 'name email')
        .populate('passengerId', 'name email');
      
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }
      
      // Check if ride is completed
      if (ride.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Can only rate completed rides'
        });
      }
      
      // Determine who is rating and who is being rated
      let ratedUser, ratingUserType, ratedUserType;
      
      if (ratingUser.id === ride.driverId._id.toString()) {
        // Driver is rating passenger
        ratedUser = {
          userId: ride.passengerId._id,
          userModel: 'Passenger',
          name: ride.passengerId.name
        };
        ratingUserType = {
          userId: ride.driverId._id,
          userModel: 'Driver',
          name: ride.driverId.name
        };
        ratedUserType = 'Passenger';
      } else if (ratingUser.id === ride.passengerId._id.toString()) {
        // Passenger is rating driver
        ratedUser = {
          userId: ride.driverId._id,
          userModel: 'Driver',
          name: ride.driverId.name
        };
        ratingUserType = {
          userId: ride.passengerId._id,
          userModel: 'Passenger',
          name: ride.passengerId.name
        };
        ratedUserType = 'Driver';
      } else {
        return res.status(403).json({
          success: false,
          message: 'You can only rate rides you participated in'
        });
      }
      
      // Check if user has already rated this ride
      const existingRating = await Rating.findOne({
        rideId,
        'ratingUser.userId': ratingUserType.userId
      });
      
      if (existingRating) {
        return res.status(400).json({
          success: false,
          message: 'You have already rated this ride'
        });
      }
      
      // Create the rating
      const newRating = new Rating({
        rideId,
        ratedUser,
        ratingUser: ratingUserType,
        rating: parseInt(rating),
        review: review?.trim(),
        categories: categories || {}
      });
      
      await newRating.save();
      
      // Update ride rating status
      if (ratedUserType === 'Driver') {
        ride.ratingStatus.passengerRated = true;
      } else {
        ride.ratingStatus.driverRated = true;
      }
      await ride.save();
      
      // Update user's average rating
      await this.updateUserRatingStats(ratedUser.userId, ratedUser.userModel);
      
      // Notify the rated user
      this.notifyRatingReceived(req, newRating);
      
      res.status(201).json({
        success: true,
        message: 'Rating submitted successfully',
        data: {
          rating: newRating,
          ratedUser: {
            name: ratedUser.name,
            type: ratedUser.userModel
          }
        }
      });
      
    } catch (error) {
      console.error('Rating submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting rating',
        error: error.message
      });
    }
  }
  
  // Update user's rating statistics
  async updateUserRatingStats(userId, userModel) {
    try {
      const ratingStats = await Rating.getUserAverageRating(userId, userModel);
      const categoryAverages = await Rating.getUserCategoryAverages(userId, userModel);
      
      const updateData = {
        rating: ratingStats.averageRating,
        totalRatings: ratingStats.totalRatings,
        ratingDistribution: ratingStats.ratingDistribution,
        categoryRatings: categoryAverages,
        lastRatingUpdate: new Date()
      };
      
      if (userModel === 'Driver') {
        await Driver.findByIdAndUpdate(userId, updateData);
      } else {
        await Passenger.findByIdAndUpdate(userId, updateData);
      }
      
    } catch (error) {
      console.error('Error updating user rating stats:', error);
    }
  }
  
  // Notify user about new rating
  notifyRatingReceived(req, rating) {
    try {
      const io = req.app.get('io');
      
      if (io) {
        const room = rating.ratedUser.userModel === 'Driver' 
          ? `driver-${rating.ratedUser.userId}`
          : `passenger-${rating.ratedUser.userId}`;
        
        io.to(room).emit('new-rating-received', {
          ratingId: rating._id,
          rideId: rating.rideId,
          rating: rating.rating,
          review: rating.review,
          fromUser: rating.ratingUser.name,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error sending rating notification:', error);
    }
  }
  
  // Get ratings for a user
  async getUserRatings(req, res) {
    try {
      const { userId, userType } = req.params;
      const { page = 1, limit = 10, sortBy = 'newest' } = req.query;
      
      // Validate user type
      if (!['driver', 'passenger'].includes(userType.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'User type must be either driver or passenger'
        });
      }
      
      const userModel = userType.charAt(0).toUpperCase() + userType.slice(1);
      const skip = (page - 1) * limit;
      
      // Build sort object
      let sort = { createdAt: -1 };
      if (sortBy === 'highest') sort = { rating: -1, createdAt: -1 };
      if (sortBy === 'lowest') sort = { rating: 1, createdAt: -1 };
      if (sortBy === 'oldest') sort = { createdAt: 1 };
      
      // Get ratings
      const ratings = await Rating.find({
        'ratedUser.userId': userId,
        'ratedUser.userModel': userModel,
        status: 'active'
      })
      .populate('rideId', 'pickup destination timestamps.completed')
      .populate('ratingUser.userId', 'name profilePicture')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
      
      // Get total count for pagination
      const totalRatings = await Rating.countDocuments({
        'ratedUser.userId': userId,
        'ratedUser.userModel': userModel,
        status: 'active'
      });
      
      // Get rating statistics
      const ratingStats = await Rating.getUserAverageRating(userId, userModel);
      const categoryAverages = await Rating.getUserCategoryAverages(userId, userModel);
      
      res.json({
        success: true,
        data: {
          ratings,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalRatings / limit),
            totalRatings,
            hasNext: skip + ratings.length < totalRatings,
            hasPrev: page > 1
          },
          statistics: {
            averageRating: ratingStats.averageRating,
            totalRatings: ratingStats.totalRatings,
            ratingDistribution: ratingStats.ratingDistribution,
            categoryAverages
          }
        }
      });
      
    } catch (error) {
      console.error('Error fetching user ratings:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching ratings',
        error: error.message
      });
    }
  }
  
  // Get recent ratings for dashboard
  async getRecentRatings(req, res) {
    try {
      const { limit = 5, userType } = req.query;
      
      let filter = { status: 'active' };
      if (userType) {
        const userModel = userType.charAt(0).toUpperCase() + userType.slice(1);
        filter['ratedUser.userModel'] = userModel;
      }
      
      const ratings = await Rating.find(filter)
        .populate('ratedUser.userId', 'name profilePicture')
        .populate('ratingUser.userId', 'name profilePicture')
        .populate('rideId', 'pickup.address destination.address')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      
      res.json({
        success: true,
        data: ratings
      });
      
    } catch (error) {
      console.error('Error fetching recent ratings:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching recent ratings',
        error: error.message
      });
    }
  }
  
  // Respond to a rating
  async respondToRating(req, res) {
    try {
      const { ratingId } = req.params;
      const { response } = req.body;
      const user = req.user;
      
      if (!response || response.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Response text is required'
        });
      }
      
      const rating = await Rating.findById(ratingId);
      
      if (!rating) {
        return res.status(404).json({
          success: false,
          message: 'Rating not found'
        });
      }
      
      // Check if user is the rated user
      if (rating.ratedUser.userId.toString() !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only respond to ratings about you'
        });
      }
      
      // Check if response is allowed
      if (!rating.canRespond()) {
        return res.status(400).json({
          success: false,
          message: 'Response period has expired or already responded'
        });
      }
      
      // Update rating with response
      rating.response = {
        text: response.trim(),
        respondedAt: new Date()
      };
      
      await rating.save();
      
      res.json({
        success: true,
        message: 'Response submitted successfully',
        data: rating
      });
      
    } catch (error) {
      console.error('Error responding to rating:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting response',
        error: error.message
      });
    }
  }
  
  // Flag a rating as inappropriate
  async flagRating(req, res) {
    try {
      const { ratingId } = req.params;
      const { reason, description } = req.body;
      const user = req.user;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Flag reason is required'
        });
      }
      
      const rating = await Rating.findById(ratingId);
      
      if (!rating) {
        return res.status(404).json({
          success: false,
          message: 'Rating not found'
        });
      }
      
      // Check if user has already flagged this rating
      const existingFlag = rating.flags.find(flag => 
        flag.flaggedBy.toString() === user.id && !flag.resolved
      );
      
      if (existingFlag) {
        return res.status(400).json({
          success: false,
          message: 'You have already flagged this rating'
        });
      }
      
      // Add flag
      await rating.flagRating(reason, description, user.id);
      
      res.json({
        success: true,
        message: 'Rating flagged successfully',
        data: rating
      });
      
    } catch (error) {
      console.error('Error flagging rating:', error);
      res.status(500).json({
        success: false,
        message: 'Error flagging rating',
        error: error.message
      });
    }
  }
  
  // Get rating statistics for admin
  async getRatingStatistics(req, res) {
    try {
      const { period = 'monthly' } = req.query;
      const dateRange = getDateRange(period);
      
      const stats = await Rating.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $facet: {
            totalRatings: [
              { $count: 'count' }
            ],
            averageRating: [
              { $group: { _id: null, average: { $avg: '$rating' } } }
            ],
            ratingsByType: [
              {
                $group: {
                  _id: '$ratedUser.userModel',
                  count: { $sum: 1 },
                  average: { $avg: '$rating' }
                }
              }
            ],
            dailyTrend: [
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  count: { $sum: 1 },
                  average: { $avg: '$rating' }
                }
              },
              { $sort: { _id: 1 } }
            ],
            ratingDistribution: [
              {
                $group: {
                  _id: '$rating',
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ]
          }
        }
      ]);
      
      // Get flagged ratings count
      const flaggedCount = await Rating.countDocuments({
        status: 'flagged',
        createdAt: { $gte: dateRange.start, $lte: dateRange.end }
      });
      
      res.json({
        success: true,
        data: {
          overview: {
            totalRatings: stats[0].totalRatings[0]?.count || 0,
            averageRating: stats[0].averageRating[0]?.average ? 
              Math.round(stats[0].averageRating[0].average * 100) / 100 : 0,
            flaggedRatings: flaggedCount
          },
          byType: stats[0].ratingsByType,
          dailyTrend: stats[0].dailyTrend,
          distribution: stats[0].ratingDistribution,
          period,
          dateRange
        }
      });
      
    } catch (error) {
      console.error('Error fetching rating statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching rating statistics',
        error: error.message
      });
    }
  }
}

// Helper function for date ranges
function getDateRange(period) {
  const now = new Date();
  let start, end = new Date();
  
  switch (period) {
    case 'daily':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'weekly':
      start = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'monthly':
      start = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'yearly':
      start = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
  }
  
  return { start, end };
}

export default new RatingController();