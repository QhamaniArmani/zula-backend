// controllers/notificationController.js
import Notification from '../models/Notification.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import NotificationService from '../services/notificationService.js';

class NotificationController {
  
  // Get user's notifications
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { 
        page = 1, 
        limit = 20, 
        read, 
        type, 
        category 
      } = req.query;
      
      const skip = (page - 1) * limit;
      
      // Build filter
      const filter = {
        'recipient.userId': userId
      };
      
      if (read !== undefined) {
        filter['channels.inApp.read'] = read === 'true';
      }
      
      if (type) {
        filter.type = type;
      }
      
      if (category) {
        filter.category = category;
      }
      
      // Get notifications
      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      
      // Get total count for pagination
      const total = await Notification.countDocuments(filter);
      
      // Get unread count
      const unreadCount = await Notification.getUnreadCount(userId);
      
      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total,
            hasNext: skip + notifications.length < total,
            hasPrev: page > 1
          },
          unreadCount
        }
      });
      
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notifications',
        error: error.message
      });
    }
  }
  
  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({
        _id: notificationId,
        'recipient.userId': userId
      });
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      await notification.markAsRead();
      
      // Get updated unread count
      const unreadCount = await Notification.getUnreadCount(userId);
      
      res.json({
        success: true,
        message: 'Notification marked as read',
        data: {
          notification,
          unreadCount
        }
      });
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking notification as read',
        error: error.message
      });
    }
  }
  
  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await Notification.updateMany(
        {
          'recipient.userId': userId,
          'channels.inApp.read': false
        },
        {
          $set: {
            'channels.inApp.read': true,
            'channels.inApp.readAt': new Date()
          }
        }
      );
      
      res.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`,
        data: {
          markedCount: result.modifiedCount
        }
      });
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking notifications as read',
        error: error.message
      });
    }
  }
  
  // Record notification click-through
  async recordClickThrough(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({
        _id: notificationId,
        'recipient.userId': userId
      });
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      await notification.recordClickThrough();
      
      res.json({
        success: true,
        message: 'Click-through recorded',
        data: { notification }
      });
      
    } catch (error) {
      console.error('Error recording click-through:', error);
      res.status(500).json({
        success: false,
        message: 'Error recording click-through',
        error: error.message
      });
    }
  }
  
  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        'recipient.userId': userId
      });
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
      
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting notification',
        error: error.message
      });
    }
  }
  
  // Get notification statistics
  async getNotificationStats(req, res) {
    try {
      const { period = 'weekly' } = req.query;
      const dateRange = getDateRange(period);
      
      const stats = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $facet: {
            totalNotifications: [
              { $count: 'count' }
            ],
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            byType: [
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 }
                }
              }
            ],
            byCategory: [
              {
                $group: {
                  _id: '$category',
                  count: { $sum: 1 }
                }
              }
            ],
            deliveryStats: [
              {
                $group: {
                  _id: null,
                  inAppSent: { $sum: { $cond: ['$channels.inApp.sent', 1, 0] } },
                  pushSent: { $sum: { $cond: ['$channels.push.sent', 1, 0] } },
                  smsSent: { $sum: { $cond: ['$channels.sms.sent', 1, 0] } },
                  emailSent: { $sum: { $cond: ['$channels.email.sent', 1, 0] } },
                  inAppRead: { $sum: { $cond: ['$channels.inApp.read', 1, 0] } }
                }
              }
            ],
            dailyTrend: [
              {
                $group: {
                  _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } }
            ]
          }
        }
      ]);
      
      // Get template count
      const templateCount = await NotificationTemplate.countDocuments({ isActive: true });
      
      res.json({
        success: true,
        data: {
          overview: {
            totalNotifications: stats[0].totalNotifications[0]?.count || 0,
            activeTemplates: templateCount,
            period,
            dateRange
          },
          byStatus: stats[0].byStatus,
          byType: stats[0].byType,
          byCategory: stats[0].byCategory,
          deliveryStats: stats[0].deliveryStats[0] || {},
          dailyTrend: stats[0].dailyTrend
        }
      });
      
    } catch (error) {
      console.error('Error fetching notification statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching notification statistics',
        error: error.message
      });
    }
  }
  
  // Send test notification
  async sendTestNotification(req, res) {
    try {
      const { type, channels = {} } = req.body;
      const userId = req.user.id;
      const userModel = req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1);
      
      const testData = {
        type: type || 'ride_completed',
        recipient: {
          userId,
          userModel,
          email: req.user.email,
          phone: req.user.phone
        },
        variables: {
          fare: '125.50',
          userType: 'driver',
          driverName: 'Test Driver',
          passengerName: 'Test Passenger',
          pickupAddress: '123 Test Street',
          destinationAddress: '456 Test Avenue',
          eta: '5'
        },
        channels: {
          inApp: channels.inApp !== false,
          push: channels.push === true,
          sms: channels.sms === true,
          email: channels.email === true
        },
        priority: 'normal'
      };
      
      const notification = await NotificationService.createNotification(testData);
      
      res.json({
        success: true,
        message: 'Test notification sent successfully',
        data: { notification }
      });
      
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending test notification',
        error: error.message
      });
    }
  }
  
  // Admin: Send bulk notification
  async sendBulkNotification(req, res) {
    try {
      const { userGroup, type, variables, channels } = req.body;
      
      if (!['drivers', 'passengers', 'all'].includes(userGroup)) {
        return res.status(400).json({
          success: false,
          message: 'User group must be drivers, passengers, or all'
        });
      }
      
      const notificationData = {
        type,
        variables: variables || {},
        channels: channels || {},
        priority: 'normal'
      };
      
      const result = await NotificationService.sendBulkNotification(userGroup, notificationData);
      
      res.json({
        success: true,
        message: `Bulk notification sent to ${result.totalUsers} users`,
        data: result
      });
      
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      res.status(500).json({
        success: false,
        message: 'Error sending bulk notification',
        error: error.message
      });
    }
  }
  
  // Admin: Retry failed notifications
  async retryFailedNotifications(req, res) {
    try {
      const { limit = 50 } = req.body;
      
      const result = await NotificationService.retryFailedNotifications(limit);
      
      res.json({
        success: true,
        message: `Retried ${result.total} failed notifications`,
        data: result
      });
      
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrying failed notifications',
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

export default new NotificationController();