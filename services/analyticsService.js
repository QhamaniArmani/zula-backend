import Analytics from '../models/Analytics.js';
import DriverEarnings from '../models/DriverEarnings.js';
import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';
import Passenger from '../models/Passenger.js';

class AnalyticsService {
  
  // Generate daily analytics
  async generateDailyAnalytics(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get rides for the day
      const dailyRides = await Ride.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }).populate('driverId').populate('passengerId');

      // Calculate ride statistics
      const rideStats = this.calculateRideStats(dailyRides);
      
      // Calculate financial statistics
      const financialStats = this.calculateFinancialStats(dailyRides);
      
      // Calculate driver statistics
      const driverStats = await this.calculateDriverStats(startOfDay, endOfDay);
      
      // Calculate passenger statistics
      const passengerStats = await this.calculatePassengerStats(startOfDay, endOfDay);
      
      // Calculate peak hours
      const peakHours = this.calculatePeakHours(dailyRides);
      
      // Calculate popular routes
      const popularRoutes = this.calculatePopularRoutes(dailyRides);

      // Create or update analytics record
      const analyticsData = {
        date: startOfDay,
        period: 'daily',
        rides: rideStats,
        revenue: financialStats,
        drivers: driverStats,
        passengers: passengerStats,
        peakHours,
        popularRoutes
      };

      await Analytics.findOneAndUpdate(
        { date: startOfDay, period: 'daily' },
        analyticsData,
        { upsert: true, new: true }
      );

      console.log(`✅ Daily analytics generated for ${startOfDay.toDateString()}`);
      return analyticsData;
    } catch (error) {
      console.error('Error generating daily analytics:', error);
      throw error;
    }
  }

  // Calculate ride statistics
  calculateRideStats(rides) {
    const completedRides = rides.filter(ride => ride.status === 'completed');
    const cancelledRides = rides.filter(ride => ride.status === 'cancelled');
    
    const totalDistance = completedRides.reduce((sum, ride) => sum + (ride.pricing?.distance || 0), 0);
    const totalDuration = completedRides.reduce((sum, ride) => sum + (ride.pricing?.time || 0), 0);
    
    return {
      total: rides.length,
      completed: completedRides.length,
      cancelled: cancelledRides.length,
      averageRating: completedRides.length > 0 ? 
        completedRides.reduce((sum, ride) => sum + (ride.rating || 0), 0) / completedRides.length : 0,
      averageDistance: completedRides.length > 0 ? totalDistance / completedRides.length : 0,
      averageDuration: completedRides.length > 0 ? totalDuration / completedRides.length : 0,
      totalDistance
    };
  }

  // Calculate financial statistics
  calculateFinancialStats(rides) {
    const completedRides = rides.filter(ride => ride.status === 'completed');
    const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.pricing?.totalFare || 0), 0);
    
    const byVehicleType = {
      standard: completedRides.filter(ride => ride.vehicleType === 'standard')
        .reduce((sum, ride) => sum + (ride.pricing?.totalFare || 0), 0),
      premium: completedRides.filter(ride => ride.vehicleType === 'premium')
        .reduce((sum, ride) => sum + (ride.pricing?.totalFare || 0), 0),
      luxury: completedRides.filter(ride => ride.vehicleType === 'luxury')
        .reduce((sum, ride) => sum + (ride.pricing?.totalFare || 0), 0)
    };

    return {
      total: totalRevenue,
      averageFare: completedRides.length > 0 ? totalRevenue / completedRides.length : 0,
      byVehicleType
    };
  }

  // Calculate driver statistics
  async calculateDriverStats(startDate, endDate) {
    const activeDrivers = await Driver.countDocuments({
      lastActive: { $gte: startDate, $lte: endDate }
    });
    
    const totalDrivers = await Driver.countDocuments();
    
    const newDrivers = await Driver.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate average earnings for active drivers
    const driverEarnings = await DriverEarnings.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    const averageEarnings = driverEarnings.length > 0 ? 
      driverEarnings.reduce((sum, earning) => sum + earning.earnings.total, 0) / driverEarnings.length : 0;

    return {
      active: activeDrivers,
      total: totalDrivers,
      newRegistrations: newDrivers,
      averageEarnings
    };
  }

  // Calculate passenger statistics
  async calculatePassengerStats(startDate, endDate) {
    const activePassengers = await Passenger.countDocuments({
      lastActive: { $gte: startDate, $lte: endDate }
    });
    
    const totalPassengers = await Passenger.countDocuments();
    
    const newPassengers = await Passenger.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Calculate repeat customers (passengers with more than 1 ride)
    const repeatCustomers = await Passenger.aggregate([
      {
        $lookup: {
          from: 'rides',
          localField: '_id',
          foreignField: 'passengerId',
          as: 'rides'
        }
      },
      {
        $match: {
          'rides.1': { $exists: true } // Has at least 2 rides
        }
      },
      {
        $count: 'repeatCustomers'
      }
    ]);

    return {
      active: activePassengers,
      total: totalPassengers,
      newRegistrations: newPassengers,
      repeatCustomers: repeatCustomers[0]?.repeatCustomers || 0
    };
  }

  // Calculate peak hours
  calculatePeakHours(rides) {
    const hourlyCounts = Array(24).fill(0);
    
    rides.forEach(ride => {
      const hour = new Date(ride.createdAt).getHours();
      hourlyCounts[hour]++;
    });

    return hourlyCounts.map((count, hour) => ({
      hour,
      rideCount: count
    })).sort((a, b) => b.rideCount - a.rideCount).slice(0, 5);
  }

  // Calculate popular routes
  calculatePopularRoutes(rides) {
    const routeCounts = {};
    
    rides.forEach(ride => {
      if (ride.pickup && ride.destination) {
        const routeKey = `${ride.pickup.address}|${ride.destination.address}`;
        routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
      }
    });

    return Object.entries(routeCounts)
      .map(([routeKey, count]) => {
        const [pickupArea, destinationArea] = routeKey.split('|');
        return {
          pickupArea,
          destinationArea,
          rideCount: count
        };
      })
      .sort((a, b) => b.rideCount - a.rideCount)
      .slice(0, 10);
  }

  // Get analytics for date range
  async getAnalytics(startDate, endDate, period = 'daily') {
    try {
      const analytics = await Analytics.find({
        date: { $gte: startDate, $lte: endDate },
        period
      }).sort({ date: 1 });

      return analytics;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  // Get driver earnings report
  async getDriverEarnings(driverId, startDate, endDate, period = 'daily') {
    try {
      const earnings = await DriverEarnings.find({
        driverId,
        date: { $gte: startDate, $lte: endDate },
        period
      }).sort({ date: 1 });

      return earnings;
    } catch (error) {
      console.error('Error fetching driver earnings:', error);
      throw error;
    }
  }

  // Generate driver earnings
  async generateDriverEarnings(driverId, date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get driver's rides for the day
      const driverRides = await Ride.find({
        driverId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      const completedRides = driverRides.filter(ride => ride.status === 'completed');
      const cancelledRides = driverRides.filter(ride => ride.status === 'cancelled');

      // Calculate earnings
      const earningsFromRides = completedRides.reduce((sum, ride) => sum + (ride.pricing?.totalFare || 0), 0);
      
      const earningsData = {
        driverId,
        date: startOfDay,
        period: 'daily',
        earnings: {
          total: earningsFromRides,
          fromRides: earningsFromRides,
          tips: 0, // You can add tips functionality later
          bonuses: 0 // You can add bonuses functionality later
        },
        rides: {
          completed: completedRides.length,
          cancelled: cancelledRides.length,
          totalDistance: completedRides.reduce((sum, ride) => sum + (ride.pricing?.distance || 0), 0),
          totalDuration: completedRides.reduce((sum, ride) => sum + (ride.pricing?.time || 0), 0),
          averageRating: completedRides.length > 0 ? 
            completedRides.reduce((sum, ride) => sum + (ride.rating || 0), 0) / completedRides.length : 0
        }
      };

      await DriverEarnings.findOneAndUpdate(
        { driverId, date: startOfDay, period: 'daily' },
        earningsData,
        { upsert: true, new: true }
      );

      console.log(`✅ Driver earnings generated for driver ${driverId} on ${startOfDay.toDateString()}`);
      return earningsData;
    } catch (error) {
      console.error('Error generating driver earnings:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();