import Feedback from '../models/Feedback.js';
import Ride from '../models/Ride.js';

// @desc    Submit feedback for a ride
// @route   POST /api/feedback
// @access  Private
export const submitFeedback = async (req, res) => {
  try {
    const { rideId, rating, comment, feedbackType } = req.body;
    const userId = req.user.id;

    // Check if ride exists and user is involved
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check if user is either passenger or driver in this ride
    const isPassenger = ride.passenger.toString() === userId;
    const isDriver = ride.driver.toString() === userId;

    if (!isPassenger && !isDriver) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to provide feedback for this ride'
      });
    }

    // Check if feedback already exists for this ride and user
    const existingFeedback = await Feedback.findOne({
      ride: rideId,
      user: userId
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this ride'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Create feedback
    const feedback = new Feedback({
      ride: rideId,
      user: userId,
      rating,
      comment,
      feedbackType: feedbackType || (isPassenger ? 'to_driver' : 'to_passenger'),
      targetUser: isPassenger ? ride.driver : ride.passenger
    });

    await feedback.save();

    // Update ride with feedback reference
    if (isPassenger) {
      ride.passengerFeedback = feedback._id;
    } else {
      ride.driverFeedback = feedback._id;
    }
    await ride.save();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: { feedback }
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
};

// @desc    Get user's feedback
// @route   GET /api/feedback
// @access  Private
export const getFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const userId = req.user.id;

    const query = { user: userId };
    if (type) query.feedbackType = type;

    const feedback = await Feedback.find(query)
      .populate('ride', 'pickupLocation destination fare createdAt')
      .populate('targetUser', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Feedback.countDocuments(query);

    res.json({
      success: true,
      data: {
        feedback,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback',
      error: error.message
    });
  }
};

// @desc    Get feedback for a specific ride
// @route   GET /api/feedback/ride/:rideId
// @access  Private
export const getFeedbackByRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    // Check if user is involved in the ride
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    const isInvolved = ride.passenger.toString() === userId || 
                      ride.driver.toString() === userId;

    if (!isInvolved) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view feedback for this ride'
      });
    }

    const feedback = await Feedback.find({ ride: rideId })
      .populate('user', 'name profilePicture')
      .populate('targetUser', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { feedback }
    });
  } catch (error) {
    console.error('Get feedback by ride error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback',
      error: error.message
    });
  }
};

// @desc    Get driver feedback
// @route   GET /api/feedback/driver/:driverId
// @access  Private
export const getDriverFeedback = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const feedback = await Feedback.find({ 
      targetUser: driverId,
      feedbackType: 'to_driver'
    })
      .populate('user', 'name profilePicture')
      .populate('ride', 'pickupLocation destination createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Feedback.countDocuments({ 
      targetUser: driverId,
      feedbackType: 'to_driver'
    });

    // Calculate average rating
    const averageResult = await Feedback.aggregate([
      { 
        $match: { 
          targetUser: mongoose.Types.ObjectId(driverId),
          feedbackType: 'to_driver'
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const averageRating = averageResult.length > 0 ? averageResult[0].averageRating : 0;
    const totalRatings = averageResult.length > 0 ? averageResult[0].totalRatings : 0;

    res.json({
      success: true,
      data: {
        feedback,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Get driver feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver feedback',
      error: error.message
    });
  }
};

// @desc    Get average ratings
// @route   GET /api/feedback/ratings/average
// @access  Private
export const getAverageRatings = async (req, res) => {
  try {
    const userId = req.user.id;

    const ratings = await Feedback.aggregate([
      {
        $match: { targetUser: mongoose.Types.ObjectId(userId) }
      },
      {
        $group: {
          _id: '$feedbackType',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(ratingGroup => {
      ratingGroup.ratingDistribution.forEach(rating => {
        distribution[rating] = (distribution[rating] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        ratings,
        distribution
      }
    });
  } catch (error) {
    console.error('Get average ratings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get average ratings',
      error: error.message
    });
  }
};

// @desc    Update feedback
// @route   PUT /api/feedback/:id
// @access  Private
export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user owns this feedback
    if (feedback.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this feedback'
      });
    }

    // Check if feedback can be updated (within 24 hours)
    const timeDiff = Date.now() - feedback.createdAt.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be updated within 24 hours of submission'
      });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
      feedback.rating = rating;
    }

    if (comment !== undefined) {
      feedback.comment = comment;
    }

    feedback.updatedAt = new Date();
    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      data: { feedback }
    });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback',
      error: error.message
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user owns this feedback
    if (feedback.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this feedback'
      });
    }

    await Feedback.findByIdAndDelete(id);

    // Remove feedback reference from ride
    const ride = await Ride.findById(feedback.ride);
    if (ride) {
      if (ride.passengerFeedback && ride.passengerFeedback.toString() === id) {
        ride.passengerFeedback = null;
      }
      if (ride.driverFeedback && ride.driverFeedback.toString() === id) {
        ride.driverFeedback = null;
      }
      await ride.save();
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: error.message
    });
  }
};
