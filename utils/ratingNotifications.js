// utils/ratingNotifications.js
import Ride from '../models/Ride.js';
import Rating from '../models/Rating.js';

class RatingNotifications {
  
  // Send rating reminders for completed rides
  async sendRatingReminders() {
    try {
      console.log('🔔 Checking for rating reminders...');
      
      const ridesNeedingReminders = await Ride.findRidesForRatingReminder(24); // 24 hours after completion
      
      console.log(`📧 Found ${ridesNeedingReminders.length} rides needing rating reminders`);
      
      for (const ride of ridesNeedingReminders) {
        await this.sendReminderForRide(ride);
        await ride.markRatingReminderSent();
      }
      
      return {
        success: true,
        remindersSent: ridesNeedingReminders.length,
        rides: ridesNeedingReminders.map(ride => ride._id)
      };
      
    } catch (error) {
      console.error('❌ Error sending rating reminders:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Send reminder for a specific ride
  async sendReminderForRide(ride) {
    try {
      const reminders = [];
      
      // Check if driver needs to rate passenger
      if (!ride.ratingStatus.driverRated && ride.driverId) {
        reminders.push({
          userId: ride.driverId._id,
          userType: 'driver',
          userName: ride.driverId.name,
          email: ride.driverId.email,
          message: `Rate your passenger ${ride.passengerId.name} for your recent ride`
        });
      }
      
      // Check if passenger needs to rate driver
      if (!ride.ratingStatus.passengerRated && ride.passengerId) {
        reminders.push({
          userId: ride.passengerId._id,
          userType: 'passenger', 
          userName: ride.passengerId.name,
          email: ride.passengerId.email,
          message: `Rate your driver ${ride.driverId.name} for your recent ride`
        });
      }
      
      // In a real implementation, you would:
      // 1. Send email notifications
      // 2. Send push notifications
      // 3. Send in-app notifications
      
      console.log(`📨 Sending ${reminders.length} rating reminders for ride ${ride._id}`);
      
      // Simulate notification sending
      for (const reminder of reminders) {
        console.log(`💌 Rating reminder to ${reminder.userType} ${reminder.userName}: ${reminder.message}`);
        // await this.sendEmailNotification(reminder);
        // await this.sendPushNotification(reminder);
      }
      
      return reminders.length;
      
    } catch (error) {
      console.error(`❌ Error sending reminder for ride ${ride._id}:`, error);
      return 0;
    }
  }
  
  // Get rating insights for a user
  async getUserRatingInsights(userId, userType) {
    try {
      const userModel = userType === 'driver' ? 'Driver' : 'Passenger';
      
      // Get recent ratings
      const recentRatings = await Rating.find({
        'ratedUser.userId': userId,
        'ratedUser.userModel': userModel,
        status: 'active'
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('ratingUser.userId', 'name profilePicture');
      
      // Calculate rating trend (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const monthlyTrend = await Rating.aggregate([
        {
          $match: {
            'ratedUser.userId': mongoose.Types.ObjectId(userId),
            'ratedUser.userModel': userModel,
            status: 'active',
            createdAt: { $gte: threeMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m', date: '$createdAt' }
            },
            averageRating: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Get category strengths and weaknesses
      const categoryStats = await Rating.aggregate([
        {
          $match: {
            'ratedUser.userId': mongoose.Types.ObjectId(userId),
            'ratedUser.userModel': userModel,
            status: 'active'
          }
        },
        {
          $project: {
            categories: 1
          }
        }
      ]);
      
      const categoryAverages = {};
      const categoryCounts = {};
      
      categoryStats.forEach(rating => {
        Object.entries(rating.categories).forEach(([category, score]) => {
          if (score !== null) {
            categoryAverages[category] = (categoryAverages[category] || 0) + score;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          }
        });
      });
      
      const strengths = [];
      const improvements = [];
      
      Object.entries(categoryAverages).forEach(([category, total]) => {
        const average = total / categoryCounts[category];
        if (average >= 4.5) {
          strengths.push(category);
        } else if (average <= 3.0) {
          improvements.push(category);
        }
      });
      
      return {
        recentRatings,
        monthlyTrend,
        strengths,
        improvements,
        totalRatedRides: recentRatings.length
      };
      
    } catch (error) {
      console.error('Error getting rating insights:', error);
      return null;
    }
  }
}

export default new RatingNotifications();