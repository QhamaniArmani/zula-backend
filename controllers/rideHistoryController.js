import Ride from '../models/Ride.js';
import mongoose from 'mongoose';

// @desc    Get user ride history
// @route   GET /api/ride-history/user
// @access  Private
export const getUserRideHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    const userId = req.user.id;

    const query = { passenger: userId };
    
    // Filter by status
    if (status) query.status = status;
    
    // Filter by date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const rides = await Ride.find(query)
      .populate('driver', 'name phone profilePicture vehicle')
      .populate('vehicleType', 'name baseFare perKmFare perMinuteFare')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      data: {
        rides,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Get user ride history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ride history',
      error: error.message
    });
  }
};

// @desc    Get driver ride history
// @route   GET /api/ride-history/driver
// @access  Private
export const getDriverRideHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;
    const userId = req.user.id;

    const query = { driver: userId };
    
    // Filter by status
    if (status) query.status = status;
    
    // Filter by date range
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const rides = await Ride.find(query)
      .populate('passenger', 'name phone profilePicture')
      .populate('vehicleType', 'name baseFare perKmFare perMinuteFare')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      data: {
        rides,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Get driver ride history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver ride history',
      error: error.message
    });
  }
};

// @desc    Get ride history by ID
// @route   GET /api/ride-history/:id
// @access  Private
export const getRideHistoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const ride = await Ride.findById(id)
      .populate('driver', 'name phone profilePicture vehicle rating')
      .populate('passenger', 'name phone profilePicture rating')
      .populate('vehicleType', 'name baseFare perKmFare perMinuteFare')
      .populate('passengerFeedback')
      .populate('driverFeedback');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Check if user is involved in this ride
    const isInvolved = ride.passenger._id.toString() === req.user.id || 
                      ride.driver._id.toString() === req.user.id;

    if (!isInvolved) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this ride'
      });
    }

    res.json({
      success: true,
      data: { ride }
    });
  } catch (error) {
    console.error('Get ride history by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ride details',
      error: error.message
    });
  }
};

// @desc    Get ride statistics
// @route   GET /api/ride-history/statistics
// @access  Private
export const getRideStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query; // day, week, month, year

    const dateRange = getDateRange(period);
    
    // Determine if user is driver or passenger
    const driverRides = await Ride.countDocuments({ 
      driver: userId,
      status: 'completed',
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const passengerRides = await Ride.countDocuments({ 
      passenger: userId,
      status: 'completed',
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const isDriver = driverRides > passengerRides;
    const userField = isDriver ? 'driver' : 'passenger';

    // Get completed rides count
    const completedRides = await Ride.countDocuments({
      [userField]: userId,
      status: 'completed',
      createdAt: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Get total earnings (for drivers) or spending (for passengers)
    const financialData = await Ride.aggregate([
      {
        $match: {
          [userField]: mongoose.Types.ObjectId(userId),
          status: 'completed',
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$fare.amount' },
          averageRating: { $avg: `$${isDriver ? 'driverRating' : 'passengerRating'}` },
          totalDistance: { $sum: '$distance' },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    // Get rides by status
    const ridesByStatus = await Ride.aggregate([
      {
        $match: {
          [userField]: mongoose.Types.ObjectId(userId),
          createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get weekly/monthly trend
    const trendData = await getRideTrend(userId, userField, period);

    const statistics = {
      userType: isDriver ? 'driver' : 'passenger',
      period,
      completedRides,
      financial: financialData[0] || {
        totalAmount: 0,
        averageRating: 0,
        totalDistance: 0,
        totalDuration: 0
      },
      ridesByStatus: ridesByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      trend: trendData
    };

    res.json({
      success: true,
      data: { statistics }
    });
  } catch (error) {
    console.error('Get ride statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get ride statistics',
      error: error.message
    });
  }
};

// @desc    Export ride history
// @route   GET /api/ride-history/export
// @access  Private
export const exportRideHistory = async (req, res) => {
  try {
    const { format = 'json', dateFrom, dateTo } = req.query;
    const userId = req.user.id;

    const query = { 
      $or: [{ passenger: userId }, { driver: userId }],
      status: 'completed'
    };

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const rides = await Ride.find(query)
      .populate('driver', 'name phone vehicle')
      .populate('passenger', 'name phone')
      .populate('vehicleType', 'name')
      .sort({ createdAt: -1 })
      .select('-__v');

    if (format === 'csv') {
      // Convert to CSV
      const csvData = convertToCSV(rides);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=ride-history.csv');
      return res.send(csvData);
    } else {
      // Default to JSON
      res.json({
        success: true,
        data: { rides },
        export: {
          format: 'json',
          generatedAt: new Date().toISOString(),
          totalRides: rides.length
        }
      });
    }
  } catch (error) {
    console.error('Export ride history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export ride history',
      error: error.message
    });
  }
};

// Helper functions
const getDateRange = (period) => {
  const now = new Date();
  let start, end = now;

  switch (period) {
    case 'day':
      start = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      start = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      start = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      start = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      start = new Date(now.setMonth(now.getMonth() - 1));
  }

  return { start, end };
};

const getRideTrend = async (userId, userField, period) => {
  const groupFormat = period === 'day' ? '%Y-%m-%d' : 
                     period === 'week' ? '%Y-%U' : '%Y-%m';

  const trend = await Ride.aggregate([
    {
      $match: {
        [userField]: mongoose.Types.ObjectId(userId),
        status: 'completed'
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: groupFormat,
            date: '$createdAt'
          }
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$fare.amount' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return trend;
};

const convertToCSV = (rides) => {
  const headers = ['Date', 'Passenger', 'Driver', 'Vehicle', 'Pickup', 'Destination', 'Distance', 'Duration', 'Fare', 'Status'];
  
  const csvRows = [
    headers.join(','),
    ...rides.map(ride => [
      ride.createdAt.toISOString().split('T')[0],
      `"${ride.passenger?.name || 'N/A'}"`,
      `"${ride.driver?.name || 'N/A'}"`,
      `"${ride.vehicleType?.name || 'N/A'}"`,
      `"${ride.pickupLocation?.address || 'N/A'}"`,
      `"${ride.destination?.address || 'N/A'}"`,
      ride.distance || 0,
      ride.duration || 0,
      ride.fare?.amount || 0,
      ride.status
    ].join(','))
  ];

  return csvRows.join('\n');
};
