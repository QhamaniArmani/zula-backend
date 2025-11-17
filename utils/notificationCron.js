// utils/notificationCron.js
import cron from 'node-cron';
import NotificationService from '../services/notificationService.js';
import Notification from '../models/Notification.js';

// Clean up old notifications daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    console.log('🧹 Cleaning up old notifications...');
    const deletedCount = await Notification.cleanupOldNotifications(30);
    console.log(`✅ Cleaned up ${deletedCount} old notifications`);
  } catch (error) {
    console.error('❌ Error cleaning up old notifications:', error);
  }
});

// Retry failed notifications hourly
cron.schedule('0 * * * *', async () => {
  try {
    console.log('🔄 Retrying failed notifications...');
    const result = await NotificationService.retryFailedNotifications(25);
    console.log(`✅ Retried ${result.total} failed notifications (${result.successful} successful)`);
  } catch (error) {
    console.error('❌ Error retrying failed notifications:', error);
  }
});

// Send pending notifications every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('📨 Processing pending notifications...');
    const pendingNotifications = await Notification.findPendingNotifications(50);
    
    console.log(`📋 Found ${pendingNotifications.length} pending notifications`);
    
    for (const notification of pendingNotifications) {
      try {
        const template = await NotificationTemplate.getByType(notification.type);
        const renderedContent = template.render(notification.data.variables || {});
        
        await NotificationService.sendNotification(notification, renderedContent);
      } catch (error) {
        console.error(`❌ Error processing notification ${notification._id}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error processing pending notifications:', error);
  }
});

console.log('✅ Notification cron jobs initialized');