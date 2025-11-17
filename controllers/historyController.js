// controllers/historyController.js
import Ride from '../models/Ride.js';
import Payment from '../models/Payment.js';
import Feedback from '../models/Feedback.js';

export const historyController = {
  // Get user's ride history with advanced filtering
  async getRideHistory(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType; // passenger or driver
      const {
        page = 1,
        limit = 10,
        status = 'completed',
        dateFrom,
        dateTo,
        minFare,
        maxFare,
        vehicleType,
        paymentMethod,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search // Search in addresses
      } = req.query;

      // Build filter object using the enhanced static method
      const filters = {
        status: status === 'all' ? undefined : status,
        dateFrom,
        dateTo,
        minFare,
        maxFare,
        vehicleType,
        paymentMethod,
        search
      };

      // Use the enhanced static method from Ride model
      const rides = await Ride.getUserHistory(userId, userType, filters)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Get total count for pagination
      const total = await Ride.countDocuments({
        ...(userType === 'passenger' ? { passengerId: userId } : { driverId: userId }),
        ...(status && status !== 'all' ? { status } : {})
      });

      // Enhance rides with additional data
      const enhancedRides = await Promise.all(
        rides.map(async (ride) => {
          const [payment, feedback] = await Promise.all([
            Payment.findOne({ rideId: ride._id }),
            Feedback.findOne({ rideId: ride._id })
          ]);

          return {
            id: ride._id,
            pickup: ride.pickup.address,
            destination: ride.destination.address,
            date: ride.createdAt,
            formattedDate: ride.formattedDate,
            formattedTime: ride.formattedTime,
            status: ride.status,
            vehicleType: ride.vehicleType,
            fare: ride.pricing.totalFare,
            distance: ride.actualDistance,
            duration: ride.durationMinutes,
            driver: ride.driverId ? {
              name: ride.driverId.name,
              vehicle: ride.driverId.vehicle
            } : null,
            passenger: ride.passengerId ? {
              name: ride.passengerId.name
            } : null,
            payment: payment ? {
              method: payment.paymentMethod,
              status: payment.status,
              transactionId: payment.transactionId
            } : {
              method: ride.payment.method,
              status: ride.payment.status,
              amount: ride.payment.amount
            },
            feedback: feedback ? {
              passengerSubmitted: !!feedback.passengerFeedback?.rating,
              driverSubmitted: !!feedback.driverFeedback?.rating,
              passengerRating: feedback.passengerFeedback?.rating,
              driverRating: feedback.driverFeedback?.rating
            } : null,
            timestamps: ride.timestamps,
            cancellation: ride.cancellation?.cancelledBy ? {
              cancelledBy: ride.cancellation.cancelledBy,
              reason: ride.cancellation.cancellationReason,
              fee: ride.cancellation.cancellationFee
            } : null
          };
        })
      );

      res.json({
        success: true,
        rides: enhancedRides,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRides: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        },
        filters: {
          status,
          dateFrom,
          dateTo,
          minFare,
          maxFare,
          vehicleType,
          paymentMethod,
          search
        }
      });

    } catch (error) {
      console.error('History fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ride history',
        error: error.message
      });
    }
  },

  // Get detailed ride history with analytics
  async getRideAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;
      const { period = 'month' } = req.query; // day, week, month, year

      // Use the enhanced static method from Ride model
      const analytics = await Ride.getHistoryAnalytics(userId, userType, period);

      res.json({
        success: true,
        analytics: {
          ...analytics,
          period,
          startDate: getDateRange(period).start,
          endDate: getDateRange(period).end
        }
      });

    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ride analytics',
        error: error.message
      });
    }
  },

  // Get ride statistics for dashboard
  async getRideStatistics(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let matchQuery = {
        createdAt: { $gte: thirtyDaysAgo }
      };

      if (userType === 'passenger') {
        matchQuery.passengerId = userId;
      } else if (userType === 'driver') {
        matchQuery.driverId = userId;
      }

      const stats = await Ride.aggregate([
        { $match: matchQuery },
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            dailyActivity: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt'
                    }
                  },
                  count: { $sum: 1 },
                  totalEarnings: { $sum: '$pricing.totalFare' }
                }
              },
              { $sort: { _id: 1 } },
              { $limit: 30 }
            ],
            fareStats: [
              {
                $group: {
                  _id: null,
                  totalEarnings: { $sum: '$pricing.totalFare' },
                  averageFare: { $avg: '$pricing.totalFare' },
                  minFare: { $min: '$pricing.totalFare' },
                  maxFare: { $max: '$pricing.totalFare' }
                }
              }
            ],
            popularRoutes: [
              { $match: { status: 'completed' } },
              {
                $group: {
                  _id: {
                    pickup: '$pickup.address',
                    dropoff: '$destination.address'
                  },
                  count: { $sum: 1 },
                  averageFare: { $avg: '$pricing.totalFare' }
                }
              },
              { $sort: { count: -1 } },
              { $limit: 5 }
            ],
            vehicleTypeStats: [
              {
                $group: {
                  _id: '$vehicleType',
                  count: { $sum: 1 },
                  totalEarnings: { $sum: '$pricing.totalFare' }
                }
              }
            ],
            paymentMethodStats: [
              {
                $group: {
                  _id: '$payment.method',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$payment.amount' }
                }
              }
            ]
          }
        }
      ]);

      // Format the response
      const formattedStats = {
        statusCounts: stats[0].statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        dailyActivity: stats[0].dailyActivity,
        fareStats: stats[0].fareStats[0] || {},
        popularRoutes: stats[0].popularRoutes,
        vehicleTypeStats: stats[0].vehicleTypeStats.reduce((acc, curr) => {
          acc[curr._id] = { count: curr.count, totalEarnings: curr.totalEarnings };
          return acc;
        }, {}),
        paymentMethodStats: stats[0].paymentMethodStats.reduce((acc, curr) => {
          acc[curr._id] = { count: curr.count, totalAmount: curr.totalAmount };
          return acc;
        }, {})
      };

      res.json({
        success: true,
        statistics: formattedStats,
        period: 'last_30_days'
      });

    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch ride statistics',
        error: error.message
      });
    }
  },

  // Export ride history
  async exportRideHistory(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;
      const { format = 'json', dateFrom, dateTo } = req.query;

      const filters = { dateFrom, dateTo };
      const rides = await Ride.getUserHistory(userId, userType, filters);

      // Enhance rides with payment and feedback info
      const enhancedRides = await Promise.all(
        rides.map(async (ride) => {
          const payment = await Payment.findOne({ rideId: ride._id });
          const feedback = await Feedback.findOne({ rideId: ride._id });

          return {
            rideId: ride._id,
            date: ride.createdAt,
            passenger: ride.passengerId?.name,
            driver: ride.driverId?.name,
            vehicle: ride.driverId?.vehicle?.model || ride.driverId?.vehicle,
            pickup: ride.pickup.address,
            dropoff: ride.destination.address,
            distance: `${ride.actualDistance} km`,
            duration: `${ride.actualDuration} min`,
            fare: ride.pricing.totalFare,
            status: ride.status,
            vehicleType: ride.vehicleType,
            paymentMethod: payment?.paymentMethod || ride.payment.method,
            paymentStatus: payment?.status || ride.payment.status,
            transactionId: payment?.transactionId,
            passengerRating: feedback?.passengerFeedback?.rating,
            driverRating: feedback?.driverFeedback?.rating,
            cancellationReason: ride.cancellation?.cancellationReason
          };
        })
      );

      if (format === 'csv') {
        // Convert to CSV
        const csv = convertToCSV(enhancedRides);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ride-history-${Date.now()}.csv`);
        return res.send(csv);
      }

      // Default JSON response
      res.json({
        success: true,
        rides: enhancedRides,
        exportInfo: {
          format,
          exportedAt: new Date(),
          totalRides: enhancedRides.length,
          dateRange: { dateFrom, dateTo }
        }
      });

    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export ride history',
        error: error.message
      });
    }
  },

  // Search rides by location
  async searchRides(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;
      const { q: searchTerm, limit = 10 } = req.query;

      if (!searchTerm || searchTerm.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be at least 3 characters long'
        });
      }

      let query = {};
      if (userType === 'passenger') {
        query.passengerId = userId;
      } else if (userType === 'driver') {
        query.driverId = userId;
      }

      query.$or = [
        { 'pickup.address': { $regex: searchTerm, $options: 'i' } },
        { 'destination.address': { $regex: searchTerm, $options: 'i' } },
        { 'driverId.name': { $regex: searchTerm, $options: 'i' } },
        { 'passengerId.name': { $regex: searchTerm, $options: 'i' } }
      ];

      const rides = await Ride.find(query)
        .populate('driverId', 'name vehicle')
        .populate('passengerId', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        searchTerm,
        results: rides.map(ride => ({
          id: ride._id,
          pickup: ride.pickup.address,
          dropoff: ride.destination.address,
          date: ride.createdAt,
          fare: ride.pricing.totalFare,
          status: ride.status,
          driver: ride.driverId?.name,
          passenger: ride.passengerId?.name,
          vehicleType: ride.vehicleType
        })),
        totalResults: rides.length
      });

    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error.message
      });
    }
  },

  // 🆕 Get popular routes
  async getPopularRoutes(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;
      const { limit = 5 } = req.query;

      const popularRoutes = await Ride.getPopularRoutes(userId, userType, parseInt(limit));

      res.json({
        success: true,
        popularRoutes: popularRoutes.map(route => ({
          pickup: route._id.pickup,
          dropoff: route._id.dropoff,
          rideCount: route.count,
          averageFare: Math.round(route.averageFare * 100) / 100,
          averageDistance: Math.round(route.averageDistance * 100) / 100,
          averageDuration: Math.round(route.averageDuration * 100) / 100
        }))
      });

    } catch (error) {
      console.error('Popular routes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular routes',
        error: error.message
      });
    }
  },

  // 🆕 Get payment statistics
  async getPaymentStats(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType;
      const { period = 'month' } = req.query;

      const dateRange = getDateRange(period);
      
      let matchQuery = {
        createdAt: { $gte: dateRange.start, $lte: dateRange.end }
      };

      if (userType === 'passenger') {
        matchQuery.passengerId = userId;
      } else if (userType === 'driver') {
        matchQuery.driverId = userId;
      }

      const paymentStats = await Ride.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$payment.method',
            totalRides: { $sum: 1 },
            totalAmount: { $sum: '$payment.amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$payment.status', 'failed'] }, 1, 0] }
            },
            pendingPayments: {
              $sum: { $cond: [{ $eq: ['$payment.status', 'pending'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            paymentMethod: '$_id',
            totalRides: 1,
            totalAmount: { $round: ['$totalAmount', 2] },
            successfulPayments: 1,
            failedPayments: 1,
            pendingPayments: 1,
            successRate: {
              $round: [{
                $multiply: [{
                  $divide: ['$successfulPayments', '$totalRides']
                }, 100]
              }, 2]
            }
          }
        }
      ]);

      res.json({
        success: true,
        paymentStats,
        period,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end
        }
      });

    } catch (error) {
      console.error('Payment stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment statistics',
        error: error.message
      });
    }
  }
};

// Helper functions
function getDateRange(period) {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'day':
      start.setDate(start.getDate() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
  }

  return { start, end };
}

function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values that might contain commas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}