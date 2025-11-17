// utils/ratingCron.js
import cron from 'node-cron';
import RatingNotifications from './ratingNotifications.js';

// Run daily at 9 AM to send rating reminders
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('⏰ Running daily rating reminder job...');
    const result = await RatingNotifications.sendRatingReminders();
    console.log('✅ Rating reminder job completed:', result);
  } catch (error) {
    console.error('❌ Rating reminder job failed:', error);
  }
});

// Run weekly to clean up expired rating eligibility
cron.schedule('0 0 * * 0', async () => {
  try {
    console.log('🧹 Cleaning up expired rating eligibility...');
    
    const expiredCutoff = new Date();
    const result = await Ride.updateMany(
      {
        'ratingStatus.canBeRatedUntil': { $lt: expiredCutoff },
        $or: [
          { 'ratingStatus.driverRated': false },
          { 'ratingStatus.passengerRated': false }
        ]
      },
      {
        $set: {
          'ratingStatus.driverRated': true,
          'ratingStatus.passengerRated': true,
          'ratingStatus.ratingReminderSent': true
        }
      }
    );
    
    console.log(`✅ Cleaned up ${result.modifiedCount} expired rating eligibilities`);
  } catch (error) {
    console.error('❌ Rating eligibility cleanup failed:', error);
  }
});

console.log('✅ Rating cron jobs initialized');