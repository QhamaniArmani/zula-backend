// controllers/analyticsController.js
import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';
import mongoose from 'mongoose';

class AnalyticsController {
  
  // Get platform analytics (admin)
  async getPlatformAnalytics(req, res) {
    try {
      const { period = 'monthly' } = req.query;
      const dateRange = getDateRange(period);
      
      const platformMetrics = await Ride.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $facet: {
            totalRides: [
              { $group: { _id: null, count: { $sum: 1 } } }
            ],
            completedRides: [
              { $match: { status: 'completed' } },
              { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$fare' } } }
            ],
            cancelledRides: [
              { $match: { status: 'cancelled' } },
              { $group: { _id: null, count: { $sum: 1 } } }
            ],
            dailyTrend: [
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  rides: { $sum: 1 },
                  revenue: { $sum: '$fare' }
                }
              },
              { $sort: { _id: 1 } }
            ]
          }
        }
      ]);
      
      const driverMetrics = await Driver.aggregate([
        {
          $facet: {
            totalDrivers: [
              { $group: { _id: null, count: { $sum: 1 } } }
            ],
            activeDrivers: [
              { $match: { isActive: true } },
              { $group: { _id: null, count: { $sum: 1 } } }
            ]
          }
        }
      ]);
      
      res.json({
        success: true,
        data: {
          platform: platformMetrics[0],
          drivers: driverMetrics[0],
          period,
          dateRange
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching platform analytics',
        error: error.message
      });
    }
  }

  // Get dashboard overview (admin)
  async getDashboardOverview(req, res) {
    try {
      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const [todayStats, weeklyStats, driverStats] = await Promise.all([
        // Today's rides
        Ride.aggregate([
          {
            $match: {
              createdAt: { $gte: today, $lt: tomorrow }
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              revenue: { $sum: '$fare' }
            }
          }
        ]),
        
        // Weekly trend
        Ride.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(today.setDate(today.getDate() - 7)) }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              rides: { $sum: 1 },
              revenue: { $sum: '$fare' }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        
        // Driver stats
        Driver.aggregate([
          {
            $facet: {
              total: [{ $count: 'count' }],
              active: [{ $match: { isActive: true } }, { $count: 'count' }],
              online: [{ $match: { availabilityStatus: 'online' } }, { $count: 'count' }]
            }
          }
        ])
      ]);
      
      res.json({
        success: true,
        data: {
          today: todayStats,
          weeklyTrend: weeklyStats,
          drivers: driverStats[0],
          updatedAt: new Date()
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard overview',
        error: error.message
      });
    }
  }

  // Get driver earnings report
  async getDriverEarningsReport(req, res) {
    try {
      const { driverId } = req.params;
      const { period = 'monthly' } = req.query;
      
      const dateRange = getDateRange(period);
      
      const earnings = await Ride.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(driverId),
            status: 'completed',
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$fare' },
            totalRides: { $sum: 1 },
            averageFare: { $avg: '$fare' }
          }
        }
      ]);
      
      const dailyBreakdown = await Ride.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(driverId),
            status: 'completed',
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            dailyEarnings: { $sum: '$fare' },
            rideCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      const rideStats = await Ride.aggregate([
        {
          $match: {
            driverId: new mongoose.Types.ObjectId(driverId),
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
      
      res.json({
        success: true,
        data: {
          summary: earnings[0] || { totalEarnings: 0, totalRides: 0, averageFare: 0 },
          dailyBreakdown,
          rideStats,
          period,
          dateRange
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching driver earnings',
        error: error.message
      });
    }
  }

  // Get driver dashboard
  async getDriverDashboard(req, res) {
    try {
      const { driverId } = req.params;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const [todayEarnings, weeklyEarnings, rideStats] = await Promise.all([
        // Today's earnings
        Ride.aggregate([
          {
            $match: {
              driverId: new mongoose.Types.ObjectId(driverId),
              status: 'completed',
              createdAt: { $gte: today, $lt: tomorrow }
            }
          },
          {
            $group: {
              _id: null,
              earnings: { $sum: '$fare' },
              rides: { $sum: 1 }
            }
          }
        ]),
        
        // Weekly earnings
        Ride.aggregate([
          {
            $match: {
              driverId: new mongoose.Types.ObjectId(driverId),
              status: 'completed',
              createdAt: { $gte: new Date(today.setDate(today.getDate() - 7)) }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              earnings: { $sum: '$fare' },
              rides: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        
        // Ride status breakdown
        Ride.aggregate([
          {
            $match: {
              driverId: new mongoose.Types.ObjectId(driverId),
              createdAt: { $gte: new Date(today.setDate(today.getDate() - 30)) }
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ])
      ]);
      
      res.json({
        success: true,
        data: {
          today: todayEarnings[0] || { earnings: 0, rides: 0 },
          weekly: weeklyEarnings,
          stats: rideStats,
          updatedAt: new Date()
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching driver dashboard',
        error: error.message
      });
    }
  }

  // Generate daily analytics
  async generateDailyAnalytics(req, res) {
    try {
      // This would typically run as a cron job
      // For now, just return success
      res.json({
        success: true,
        message: 'Daily analytics generation endpoint',
        data: {
          generatedAt: new Date(),
          note: 'In production, this would generate daily reports'
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating daily analytics',
        error: error.message
      });
    }
  }
}

// Helper function to calculate date ranges
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

// Export the controller instance with all methods
export default new AnalyticsController();

// Named exports for the routes
export const getPlatformAnalytics = AnalyticsController.prototype.getPlatformAnalytics;
export const getDashboardOverview = AnalyticsController.prototype.getDashboardOverview;
export const getDriverEarningsReport = AnalyticsController.prototype.getDriverEarningsReport;
export const getDriverDashboard = AnalyticsController.prototype.getDriverDashboard;
export const generateDailyAnalytics = AnalyticsController.prototype.generateDailyAnalytics;