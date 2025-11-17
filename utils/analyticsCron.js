// utils/analyticsCron.js
import cron from 'node-cron';
import RideStats from '../models/Analytics.js';
import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';

// Run daily at midnight to update analytics
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily analytics update...');
    
    const drivers = await Driver.find({ isActive: true });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const driver of drivers) {
      // Calculate daily stats
      const dailyStats = await calculateDriverStats(driver._id, yesterday, today, 'daily');
      await RideStats.findOneAndUpdate(
        { 
          driverId: driver._id, 
          date: yesterday,
          period: 'daily'
        },
        dailyStats,
        { upsert: true, new: true }
      );
    }
    
    console.log('Daily analytics update completed');
  } catch (error) {
    console.error('Error in analytics cron job:', error);
  }
});

async function calculateDriverStats(driverId, startDate, endDate, period) {
  const rides = await Ride.find({
    driverId,
    createdAt: { $gte: startDate, $lte: endDate }
  });
  
  const completedRides = rides.filter(ride => ride.status === 'completed');
  const cancelledRides = rides.filter(ride => ride.status === 'cancelled');
  const totalEarnings = completedRides.reduce((sum, ride) => sum + ride.fare, 0);
  
  // Calculate peak hours
  const hourCounts = {};
  completedRides.forEach(ride => {
    const hour = new Date(ride.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), rideCount: count }))
    .sort((a, b) => b.rideCount - a.rideCount)
    .slice(0, 5);
  
  return {
    driverId,
    date: startDate,
    period,
    totalRides: rides.length,
    completedRides: completedRides.length,
    cancelledRides: cancelledRides.length,
    totalEarnings,
    averageRating: 0, // You can calculate this from ratings if implemented
    peakHours
  };
}

export { calculateDriverStats };