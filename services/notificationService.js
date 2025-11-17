// services/notificationService.js
import Notification from '../models/Notification.js';
import NotificationTemplate from '../models/NotificationTemplate.js';
import Driver from '../models/Driver.js';
import Passenger from '../models/Passenger.js';

class NotificationService {
  
  // Create and send a notification
  async createNotification(notificationData) {
    try {
      console.log(`📨 Creating notification: ${notificationData.type} for ${notificationData.recipient.userId}`);
      
      // Get template for this notification type
      const template = await NotificationTemplate.getByType(notificationData.type);
      if (!template) {
        throw new Error(`No template found for notification type: ${notificationData.type}`);
      }
      
      // Render template with variables
      const renderedContent = template.render(notificationData.variables || {});
      
      // Create notification
      const notification = new Notification({
        recipient: notificationData.recipient,
        type: notificationData.type,
        category: template.category,
        title: renderedContent.inApp.title,
        message: renderedContent.inApp.message,
        data: notificationData.data || {},
        priority: notificationData.priority || template.defaultSettings.priority,
        channels: {
          inApp: { sent: template.defaultSettings.channels.inApp },
          push: { sent: template.defaultSettings.channels.push },
          sms: { sent: template.defaultSettings.channels.sms },
          email: { sent: template.defaultSettings.channels.email }
        },
        relatedEntities: notificationData.relatedEntities || {},
        scheduledFor: notificationData.scheduledFor || new Date()
      });
      
      await notification.save();
      
      // Send notification through configured channels
      await this.sendNotification(notification, renderedContent);
      
      return notification;
      
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  // Send notification through all configured channels
  async sendNotification(notification, renderedContent) {
    try {
      console.log(`🚀 Sending notification ${notification._id} through channels...`);
      
      const sendPromises = [];
      
      // Send in-app notification
      if (notification.channels.inApp.sent) {
        sendPromises.push(this.sendInAppNotification(notification));
      }
      
      // Send push notification
      if (notification.channels.push.sent && notification.recipient.deviceTokens?.length > 0) {
        sendPromises.push(this.sendPushNotification(notification, renderedContent));
      }
      
      // Send SMS
      if (notification.channels.sms.sent && notification.recipient.phone) {
        sendPromises.push(this.sendSMSNotification(notification, renderedContent));
      }
      
      // Send email
      if (notification.channels.email.sent && notification.recipient.email) {
        sendPromises.push(this.sendEmailNotification(notification, renderedContent));
      }
      
      // Wait for all sends to complete
      await Promise.allSettled(sendPromises);
      
      // Update notification status
      await this.updateNotificationStatus(notification);
      
      console.log(`✅ Notification ${notification._id} sent successfully`);
      
    } catch (error) {
      console.error(`Error sending notification ${notification._id}:`, error);
      await this.markNotificationFailed(notification, error.message);
    }
  }
  
  // Send in-app notification (Socket.io)
  async sendInAppNotification(notification) {
    try {
      // This will be handled by the Socket.io service
      // For now, we'll just mark it as sent
      notification.channels.inApp.sent = true;
      await notification.save();
      
      console.log(`📱 In-app notification sent for ${notification._id}`);
      return { success: true, channel: 'inApp' };
      
    } catch (error) {
      console.error(`Error sending in-app notification ${notification._id}:`, error);
      notification.channels.inApp.failed = true;
      notification.channels.inApp.failureReason = error.message;
      await notification.save();
      return { success: false, channel: 'inApp', error: error.message };
    }
  }
  
  // Send push notification
  async sendPushNotification(notification, renderedContent) {
    try {
      // Simulate push notification service (Firebase, OneSignal, etc.)
      console.log(`📲 Sending push notification to ${notification.recipient.deviceTokens.length} devices`);
      
      // In a real implementation, you would:
      // 1. Send to Firebase Cloud Messaging
      // 2. Send to Apple Push Notification Service
      // 3. Send to other push services
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Mark as delivered (simulated)
      notification.channels.push.sent = true;
      notification.channels.push.delivered = true;
      await notification.save();
      
      console.log(`✅ Push notification sent for ${notification._id}`);
      return { success: true, channel: 'push' };
      
    } catch (error) {
      console.error(`Error sending push notification ${notification._id}:`, error);
      notification.channels.push.failed = true;
      notification.channels.push.failureReason = error.message;
      await notification.save();
      return { success: false, channel: 'push', error: error.message };
    }
  }
  
  // Send SMS notification
  async sendSMSNotification(notification, renderedContent) {
    try {
      // Simulate SMS service (Twilio, Africa's Talking, etc.)
      console.log(`📞 Sending SMS to ${notification.recipient.phone}`);
      
      // In a real implementation, you would:
      // 1. Integrate with Twilio
      // 2. Integrate with Africa's Talking
      // 3. Integrate with other SMS providers
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mark as delivered (simulated)
      notification.channels.sms.sent = true;
      notification.channels.sms.delivered = true;
      notification.channels.sms.messageId = `SMS_${Date.now()}`;
      await notification.save();
      
      console.log(`✅ SMS sent for ${notification._id}`);
      return { success: true, channel: 'sms' };
      
    } catch (error) {
      console.error(`Error sending SMS ${notification._id}:`, error);
      notification.channels.sms.failed = true;
      notification.channels.sms.failureReason = error.message;
      await notification.save();
      return { success: false, channel: 'sms', error: error.message };
    }
  }
  
  // Send email notification
  async sendEmailNotification(notification, renderedContent) {
    try {
      // Simulate email service (SendGrid, Mailgun, etc.)
      console.log(`📧 Sending email to ${notification.recipient.email}`);
      
      // In a real implementation, you would:
      // 1. Integrate with SendGrid
      // 2. Integrate with Mailgun
      // 3. Use email templates
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mark as delivered (simulated)
      notification.channels.email.sent = true;
      notification.channels.email.delivered = true;
      notification.channels.email.messageId = `EMAIL_${Date.now()}`;
      await notification.save();
      
      console.log(`✅ Email sent for ${notification._id}`);
      return { success: true, channel: 'email' };
      
    } catch (error) {
      console.error(`Error sending email ${notification._id}:`, error);
      notification.channels.email.failed = true;
      notification.channels.email.failureReason = error.message;
      await notification.save();
      return { success: false, channel: 'email', error: error.message };
    }
  }
  
  // Update notification status based on channel results
  async updateNotificationStatus(notification) {
    const channels = notification.channels;
    
    // Check if all sent channels failed
    const allFailed = (
      (channels.push.sent && channels.push.failed) &&
      (channels.sms.sent && channels.sms.failed) &&
      (channels.email.sent && channels.email.failed)
    );
    
    if (allFailed) {
      notification.status = 'failed';
      notification.failedAt = new Date();
    } else {
      notification.status = 'delivered';
      notification.deliveredAt = new Date();
    }
    
    notification.sentAt = new Date();
    await notification.save();
  }
  
  // Mark notification as failed
  async markNotificationFailed(notification, reason) {
    notification.status = 'failed';
    notification.failedAt = new Date();
    notification.retryCount += 1;
    
    if (notification.retryCount >= notification.maxRetries) {
      notification.channels.push.failed = true;
      notification.channels.sms.failed = true;
      notification.channels.email.failed = true;
    }
    
    await notification.save();
    
    console.log(`❌ Notification ${notification._id} marked as failed: ${reason}`);
  }
  
  // Send ride status notifications
  async sendRideStatusNotification(ride, status, additionalData = {}) {
    try {
      const notifications = [];
      
      // Get ride details with populated users
      const populatedRide = await ride.populate('driverId passengerId');
      
      // Determine notification type and recipients based on status
      switch (status) {
        case 'accepted':
          // Notify passenger that driver accepted
          notifications.push({
            type: 'ride_accepted',
            recipient: {
              userId: populatedRide.passengerId._id,
              userModel: 'Passenger',
              email: populatedRide.passengerId.email,
              phone: populatedRide.passengerId.phone
            },
            variables: {
              driverName: populatedRide.driverId.name,
              vehicleInfo: `${populatedRide.driverId.vehicle?.make} ${populatedRide.driverId.vehicle?.model} (${populatedRide.driverId.vehicle?.licensePlate})`,
              eta: additionalData.eta || '5'
            },
            relatedEntities: { rideId: ride._id },
            priority: 'normal'
          });
          break;
          
        case 'driver_en_route':
          // Notify passenger that driver is en route
          notifications.push({
            type: 'driver_en_route',
            recipient: {
              userId: populatedRide.passengerId._id,
              userModel: 'Passenger',
              email: populatedRide.passengerId.email,
              phone: populatedRide.passengerId.phone
            },
            variables: {
              driverName: populatedRide.driverId.name,
              eta: additionalData.eta || '3'
            },
            relatedEntities: { rideId: ride._id },
            priority: 'normal'
          });
          break;
          
        case 'completed':
          // Notify both driver and passenger
          notifications.push(
            {
              type: 'ride_completed',
              recipient: {
                userId: populatedRide.driverId._id,
                userModel: 'Driver',
                email: populatedRide.driverId.email,
                phone: populatedRide.driverId.phone
              },
              variables: {
                fare: populatedRide.pricing?.totalFare?.toFixed(2) || '0',
                userType: 'passenger'
              },
              relatedEntities: { rideId: ride._id },
              priority: 'normal'
            },
            {
              type: 'ride_completed',
              recipient: {
                userId: populatedRide.passengerId._id,
                userModel: 'Passenger',
                email: populatedRide.passengerId.email,
                phone: populatedRide.passengerId.phone
              },
              variables: {
                fare: populatedRide.pricing?.totalFare?.toFixed(2) || '0',
                userType: 'driver'
              },
              relatedEntities: { rideId: ride._id },
              priority: 'normal'
            }
          );
          break;
          
        case 'cancelled':
          // Notify the other party about cancellation
          const cancelledBy = populatedRide.cancellation?.cancelledBy;
          if (cancelledBy === 'driver') {
            notifications.push({
              type: 'ride_cancelled',
              recipient: {
                userId: populatedRide.passengerId._id,
                userModel: 'Passenger',
                email: populatedRide.passengerId.email,
                phone: populatedRide.passengerId.phone
              },
              variables: {
                cancelledBy: 'driver',
                reason: populatedRide.cancellation?.cancellationReason || 'No reason provided'
              },
              relatedEntities: { rideId: ride._id },
              priority: 'high'
            });
          } else if (cancelledBy === 'passenger') {
            notifications.push({
              type: 'ride_cancelled',
              recipient: {
                userId: populatedRide.driverId._id,
                userModel: 'Driver',
                email: populatedRide.driverId.email,
                phone: populatedRide.driverId.phone
              },
              variables: {
                cancelledBy: 'passenger',
                reason: populatedRide.cancellation?.cancellationReason || 'No reason provided'
              },
              relatedEntities: { rideId: ride._id },
              priority: 'high'
            });
          }
          break;
      }
      
      // Send all notifications
      const results = [];
      for (const notificationData of notifications) {
        try {
          const result = await this.createNotification(notificationData);
          results.push({ success: true, notification: result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error sending ride status notification:', error);
      throw error;
    }
  }
  
  // Send rating notification
  async sendRatingNotification(rating) {
    try {
      const populatedRating = await rating
        .populate('ratedUser.userId')
        .populate('ratingUser.userId');
      
      const notificationData = {
        type: 'new_rating',
        recipient: {
          userId: populatedRating.ratedUser.userId._id,
          userModel: populatedRating.ratedUser.userModel,
          email: populatedRating.ratedUser.userId.email,
          phone: populatedRating.ratedUser.userId.phone
        },
        variables: {
          raterName: populatedRating.ratingUser.userId.name,
          rating: populatedRating.rating.toString(),
          review: populatedRating.review || 'No review provided'
        },
        relatedEntities: {
          ratingId: rating._id,
          rideId: rating.rideId
        },
        priority: 'normal'
      };
      
      return await this.createNotification(notificationData);
      
    } catch (error) {
      console.error('Error sending rating notification:', error);
      throw error;
    }
  }
  
  // Send bulk notifications to user group
  async sendBulkNotification(userGroup, notificationData) {
    try {
      let users = [];
      
      // Get users based on group
      switch (userGroup) {
        case 'drivers':
          users = await Driver.find({ status: 'active' }).select('_id email phone name');
          break;
        case 'passengers':
          users = await Passenger.find({ status: 'active' }).select('_id email phone name');
          break;
        case 'all':
          const [drivers, passengers] = await Promise.all([
            Driver.find({ status: 'active' }).select('_id email phone name'),
            Passenger.find({ status: 'active' }).select('_id email phone name')
          ]);
          users = [...drivers, ...passengers];
          break;
        default:
          throw new Error(`Unknown user group: ${userGroup}`);
      }
      
      console.log(`📢 Sending bulk notification to ${users.length} ${userGroup}`);
      
      const results = [];
      for (const user of users) {
        try {
          const userNotificationData = {
            ...notificationData,
            recipient: {
              userId: user._id,
              userModel: userGroup === 'drivers' ? 'Driver' : 'Passenger',
              email: user.email,
              phone: user.phone
            }
          };
          
          const result = await this.createNotification(userNotificationData);
          results.push({ success: true, userId: user._id, notification: result });
        } catch (error) {
          results.push({ success: false, userId: user._id, error: error.message });
        }
      }
      
      return {
        totalUsers: users.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
      
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw error;
    }
  }
  
  // Retry failed notifications
  async retryFailedNotifications(limit = 50) {
    try {
      const failedNotifications = await Notification.find({
        status: 'failed',
        retryCount: { $lt: 3 },
        expiresAt: { $gt: new Date() }
      }).limit(limit);
      
      console.log(`🔄 Retrying ${failedNotifications.length} failed notifications`);
      
      const results = [];
      for (const notification of failedNotifications) {
        try {
          const template = await NotificationTemplate.getByType(notification.type);
          const renderedContent = template.render(notification.data.variables || {});
          
          await this.sendNotification(notification, renderedContent);
          results.push({ success: true, notificationId: notification._id });
        } catch (error) {
          results.push({ success: false, notificationId: notification._id, error: error.message });
        }
      }
      
      return {
        total: failedNotifications.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
      
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      throw error;
    }
  }
}

export default new NotificationService();