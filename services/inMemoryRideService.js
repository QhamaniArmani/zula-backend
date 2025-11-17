// services/inMemoryRideService.js

// 🆕 ADD THIS IMPORT AT THE TOP
import { 
  calculateDistance, 
  calculateEstimatedTime, 
  calculateFare, 
  calculateSurgeMultiplier 
} from '../utils/distanceCalculations.js';

class InMemoryRideService {
  constructor() {
    this.rides = new Map(); // Store rides by ID
    this.nextRideId = 1;
  }

  // Generate a simple ID for in-memory storage
  generateId() {
    return `ride_${this.nextRideId++}`;
  }

  // Create a new ride with your exact schema structure
  createRide(rideData) {
    const rideId = this.generateId();
    
    // 🆕 CALCULATE DISTANCE AND FARE AUTOMATICALLY
    const distance = calculateDistance(
      rideData.pickup.coordinates.latitude,
      rideData.pickup.coordinates.longitude,
      rideData.destination.coordinates.latitude,
      rideData.destination.coordinates.longitude
    );

    const estimatedDuration = calculateEstimatedTime(distance, 'moderate');

    // Calculate surge pricing (simplified - in real app use real-time data)
    const surgeMultiplier = calculateSurgeMultiplier(10, 5, 'off-peak'); // Example values

    // Calculate fare using competitive pricing
    const pricing = calculateFare(
      distance, 
      estimatedDuration, 
      rideData.vehicleType || 'standard', 
      surgeMultiplier
    );

    const ride = {
      _id: rideId,
      
      // Basic ride information
      passengerId: rideData.passengerId,
      driverId: rideData.driverId || null,
      
      // Location information
      pickup: {
        address: rideData.pickup.address,
        coordinates: {
          latitude: rideData.pickup.coordinates.latitude,
          longitude: rideData.pickup.coordinates.longitude
        },
        timestamp: new Date()
      },
      destination: {
        address: rideData.destination.address,
        coordinates: {
          latitude: rideData.destination.coordinates.latitude,
          longitude: rideData.destination.coordinates.longitude
        },
        timestamp: new Date()
      },
      
      // Ride details
      vehicleType: rideData.vehicleType || 'standard',
      status: 'pending',
      
      // 🆕 AUTOMATICALLY CALCULATED PRICING
      pricing: pricing,
      
      // 🆕 CALCULATED DISTANCE AND DURATION
      distance: distance,
      estimatedDuration: estimatedDuration,
      
      // Enhanced cancellation fields
      cancellation: {
        cancelledBy: null,
        cancelledAt: null,
        cancellationReason: null,
        cancellationFee: 0,
        refundAmount: 0,
        isRefundProcessed: false,
        refundProcessedAt: null,
        refundTransactionId: null,
        penaltyApplied: false,
        penaltyAmount: 0,
        policyVersion: '1.0'
      },
      
      // Rating status fields
      ratingStatus: {
        driverRated: false,
        passengerRated: false,
        ratingReminderSent: false,
        canBeRatedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      
      // Enhanced timestamp tracking
      timestamps: {
        requested: new Date(),
        accepted: null,
        driverEnRoute: null,
        arrived: null,
        started: null,
        completed: null,
        cancelled: null
      },
      
      // Ratings (legacy fields)
      rating: null,
      driverRating: null,
      passengerRating: null,
      
      // Actual trip metrics
      actualDistance: 0,
      actualDuration: 0,
      
      // Payment information
      paymentStatus: 'pending',
      paymentMethod: rideData.paymentMethod || 'cash',
      
      // Additional analytics fields
      peakHour: false,
      routeEfficiency: null,
      
      // Real-time tracking data
      tracking: {
        route: [],
        polyline: null
      },
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rides.set(rideId, ride);
    console.log(`🚗 Ride created: ${rideId}`);
    console.log(`   Passenger: ${rideData.passengerId}`);
    console.log(`   From: ${rideData.pickup.address}`);
    console.log(`   To: ${rideData.destination.address}`);
    console.log(`   Distance: ${distance} km`);
    console.log(`   Estimated time: ${estimatedDuration} minutes`);
    console.log(`   Fare: ZAR ${pricing.totalFare}`);
    console.log(`   Total rides in memory: ${this.rides.size}`);
    
    return ride;
  }

  // Get ride by ID
  getRideById(rideId) {
    return this.rides.get(rideId);
  }

  // Update ride
  updateRide(rideId, updates) {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new Error(`Ride ${rideId} not found`);
    }

    const updatedRide = {
      ...ride,
      ...updates,
      updatedAt: new Date()
    };

    this.rides.set(rideId, updatedRide);
    console.log(`🔄 Ride updated: ${rideId}`);
    console.log(`   Status: ${updates.status || ride.status}`);
    return updatedRide;
  }

  // Update ride status with timestamp (matching your schema method)
  updateRideStatus(rideId, newStatus) {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new Error(`Ride ${rideId} not found`);
    }

    const updates = {
      status: newStatus,
      updatedAt: new Date()
    };

    // Set the corresponding timestamp
    const timestampField = {
      'accepted': 'accepted',
      'driver_en_route': 'driverEnRoute',
      'arrived': 'arrived',
      'in_progress': 'started',
      'completed': 'completed',
      'cancelled': 'cancelled'
    }[newStatus];

    if (timestampField) {
      updates.timestamps = {
        ...ride.timestamps,
        [timestampField]: new Date()
      };
    }

    // If completed, set rating eligibility period
    if (newStatus === 'completed') {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      updates.ratingStatus = {
        ...ride.ratingStatus,
        canBeRatedUntil: sevenDaysFromNow
      };
    }

    const updatedRide = { ...ride, ...updates };
    this.rides.set(rideId, updatedRide);
    
    console.log(`🔄 Ride status updated: ${rideId} -> ${newStatus}`);
    return updatedRide;
  }

  // Cancel ride with cancellation details (matching your schema method)
  cancelRide(rideId, cancelledBy, reason, cancellationFee = 0, refundAmount = 0) {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new Error(`Ride ${rideId} not found`);
    }

    const updates = {
      status: 'cancelled',
      updatedAt: new Date(),
      timestamps: {
        ...ride.timestamps,
        cancelled: new Date()
      },
      cancellation: {
        cancelledBy,
        cancelledAt: new Date(),
        cancellationReason: reason,
        cancellationFee,
        refundAmount,
        isRefundProcessed: refundAmount === 0,
        refundProcessedAt: refundAmount === 0 ? new Date() : null,
        penaltyApplied: cancellationFee > 0,
        penaltyAmount: cancellationFee,
        policyVersion: '1.0'
      }
    };

    const updatedRide = { ...ride, ...updates };
    this.rides.set(rideId, updatedRide);
    
    console.log(`❌ Ride cancelled: ${rideId}`);
    console.log(`   Cancelled by: ${cancelledBy}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Fee: ZAR ${cancellationFee}`);
    
    return updatedRide;
  }

  // Get all rides (for debugging)
  getAllRides() {
    return Array.from(this.rides.values());
  }

  // Get rides by status
  getRidesByStatus(status) {
    return this.getAllRides().filter(ride => ride.status === status);
  }

  // Get rides by passenger
  getRidesByPassenger(passengerId) {
    return this.getAllRides().filter(ride => ride.passengerId === passengerId);
  }

  // Get rides by driver
  getRidesByDriver(driverId) {
    return this.getAllRides().filter(ride => ride.driverId === driverId);
  }

  // Delete ride (for cleanup)
  deleteRide(rideId) {
    return this.rides.delete(rideId);
  }

  // Get statistics
  getStats() {
    const allRides = this.getAllRides();
    const stats = {
      total: allRides.length,
      pending: allRides.filter(r => r.status === 'pending').length,
      accepted: allRides.filter(r => r.status === 'accepted').length,
      driver_en_route: allRides.filter(r => r.status === 'driver_en_route').length,
      arrived: allRides.filter(r => r.status === 'arrived').length,
      in_progress: allRides.filter(r => r.status === 'in_progress').length,
      completed: allRides.filter(r => r.status === 'completed').length,
      cancelled: allRides.filter(r => r.status === 'cancelled').length
    };

    console.log('📊 Ride Statistics:');
    Object.entries(stats).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    return stats;
  }

  // Find rides eligible for rating (matching your schema static method)
  findRidesForRating(userId) {
    const now = new Date();
    return this.getAllRides().filter(ride => {
      const isUserInRide = ride.driverId === userId || ride.passengerId === userId;
      const isCompleted = ride.status === 'completed';
      const canStillRate = now <= ride.ratingStatus.canBeRatedUntil;
      const userHasNotRated = (ride.driverId === userId && !ride.ratingStatus.driverRated) ||
                             (ride.passengerId === userId && !ride.ratingStatus.passengerRated);

      return isUserInRide && isCompleted && canStillRate && userHasNotRated;
    });
  }

  // Clear all rides (for testing)
  clearAllRides() {
    const count = this.rides.size;
    this.rides.clear();
    this.nextRideId = 1;
    console.log(`🧹 Cleared all ${count} rides from memory`);
    return count;
  }
}

// Export a singleton instance
export default new InMemoryRideService();