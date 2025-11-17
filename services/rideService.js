// services/rideService.js
import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';
import Passenger from '../models/Passenger.js';
import FareService from './fareService.js';
import { calculateDistance, isDriverInRange } from '../utils/geoUtils.js';
import NotificationService from './notificationService.js';

class RideService {
  constructor() {
    this.activeRides = new Map(); // In-memory storage for active rides
    this.pendingRequests = new Map(); // In-memory storage for pending requests
  }

  /**
   * Request a new ride
   * @param {Object} rideData - Ride request data
   * @returns {Object} Created ride
   */
  async requestRide(rideData) {
    try {
      const {
        passengerId,
        pickup,
        destination,
        vehicleType = 'standard',
        paymentMethod = 'cash'
      } = rideData;

      // Validate passenger
      const passenger = await Passenger.findById(passengerId);
      if (!passenger) {
        throw new Error('Passenger not found');
      }

      // Calculate fare estimate
      const fareEstimate = FareService.estimateFare(pickup, destination, vehicleType, {
        timeOfDay: this.getTimeOfDay(),
        availableDrivers: await this.getAvailableDriversCount(pickup),
        pendingRides: this.pendingRequests.size
      });

      // Create ride object
      const ride = new Ride({
        passengerId,
        pickup: {
          address: pickup.address,
          coordinates: {
            latitude: pickup.latitude,
            longitude: pickup.longitude
          }
        },
        destination: {
          address: destination.address,
          coordinates: {
            latitude: destination.latitude,
            longitude: destination.longitude
          }
        },
        vehicleType,
        status: 'pending',
        pricing: fareEstimate,
        paymentMethod,
        timestamps: {
          requested: new Date()
        }
      });

      await ride.save();

      // Store in active requests
      this.pendingRequests.set(ride._id.toString(), {
        rideId: ride._id,
        passengerId,
        pickup,
        destination,
        vehicleType,
        fareEstimate,
        requestedAt: new Date(),
        expiryTime: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes expiry
      });

      // Find nearby drivers and notify them
      const nearbyDrivers = await this.findNearbyDrivers(pickup, vehicleType);
      
      // Notify nearby drivers
      for (const driver of nearbyDrivers) {
        await this.notifyDriverOfRideRequest(driver, ride);
      }

      console.log(`🚗 Ride requested: ${ride._id} by passenger ${passengerId}`);
      console.log(`📍 From: ${pickup.address} to ${destination.address}`);
      console.log(`💰 Estimated fare: ZAR ${fareEstimate.totalFare}`);

      return {
        success: true,
        ride: await ride.populate('passengerId', 'name email phone'),
        nearbyDrivers: nearbyDrivers.length,
        fareEstimate
      };

    } catch (error) {
      console.error('Error requesting ride:', error);
      throw error;
    }
  }

  /**
   * Find nearby available drivers
   * @param {Object} pickupLocation - Pickup location
   * @param {string} vehicleType - Requested vehicle type
   * @returns {Array} Array of nearby drivers
   */
  async findNearbyDrivers(pickupLocation, vehicleType = 'standard') {
    try {
      const drivers = await Driver.find({
        isAvailable: true,
        availabilityStatus: 'online',
        'vehicle.vehicleType': vehicleType
      });

      const nearbyDrivers = drivers.filter(driver => {
        if (!driver.location || !driver.location.coordinates) return false;
        
        const driverLocation = {
          latitude: driver.location.coordinates[1], // MongoDB stores as [long, lat]
          longitude: driver.location.coordinates[0]
        };

        return isDriverInRange(driverLocation, pickupLocation, 10); // 10km range
      });

      // Sort by distance (closest first)
      nearbyDrivers.sort((a, b) => {
        const distA = calculateDistance(
          { latitude: a.location.coordinates[1], longitude: a.location.coordinates[0] },
          pickupLocation
        );
        const distB = calculateDistance(
          { latitude: b.location.coordinates[1], longitude: b.location.coordinates[0] },
          pickupLocation
        );
        return distA - distB;
      });

      return nearbyDrivers.slice(0, 10); // Return top 10 closest drivers

    } catch (error) {
      console.error('Error finding nearby drivers:', error);
      return [];
    }
  }

  /**
   * Notify driver of ride request
   * @param {Object} driver - Driver object
   * @param {Object} ride - Ride object
   */
  async notifyDriverOfRideRequest(driver, ride) {
    try {
      // Create notification for driver
      await NotificationService.createNotification({
        type: 'ride_requested',
        recipient: {
          userId: driver._id,
          userModel: 'Driver',
          email: driver.email,
          phone: driver.phone
        },
        variables: {
          passengerName: ride.passengerId.name,
          pickupAddress: ride.pickup.address,
          destinationAddress: ride.destination.address,
          fare: ride.pricing.totalFare.toFixed(2)
        },
        relatedEntities: {
          rideId: ride._id
        },
        priority: 'high'
      });

      console.log(`📨 Notified driver ${driver.name} of ride request ${ride._id}`);

    } catch (error) {
      console.error('Error notifying driver:', error);
    }
  }

  /**
   * Accept a ride request
   * @param {string} rideId - Ride ID
   * @param {string} driverId - Driver ID
   * @returns {Object} Updated ride
   */
  async acceptRide(rideId, driverId) {
    try {
      const ride = await Ride.findById(rideId);
      if (!ride) {
        throw new Error('Ride not found');
      }

      if (ride.status !== 'pending') {
        throw new Error('Ride is no longer available');
      }

      const driver = await Driver.findById(driverId);
      if (!driver) {
        throw new Error('Driver not found');
      }

      if (!driver.isAvailable) {
        throw new Error('Driver is not available');
      }

      // Update ride
      ride.driverId = driverId;
      ride.status = 'accepted';
      ride.timestamps.accepted = new Date();

      await ride.save();

      // Move from pending to active rides
      this.pendingRequests.delete(rideId);
      this.activeRides.set(rideId, {
        rideId,
        passengerId: ride.passengerId,
        driverId,
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Update driver status
      driver.isAvailable = false;
      driver.availabilityStatus = 'busy';
      await driver.save();

      // Notify passenger
      await this.notifyRideStatusUpdate(ride, 'accepted');

      console.log(`✅ Ride ${rideId} accepted by driver ${driverId}`);

      return {
        success: true,
        ride: await ride.populate(['passengerId', 'driverId']),
        driver: {
          name: driver.name,
          vehicle: driver.vehicle,
          rating: driver.rating
        }
      };

    } catch (error) {
      console.error('Error accepting ride:', error);
      throw error;
    }
  }

  /**
   * Start a ride (driver en route)
   * @param {string} rideId - Ride ID
   * @param {string} driverId - Driver ID
   * @returns {Object} Updated ride
   */
  async startRide(rideId, driverId) {
    try {
      const ride = await Ride.findById(rideId).populate('driverId');
      if (!ride) {
        throw new Error('Ride not found');
      }

      if (ride.driverId._id.toString() !== driverId) {
        throw new Error('Unauthorized driver');
      }

      if (ride.status !== 'accepted') {
        throw new Error('Ride must be accepted first');
      }

      ride.status = 'driver_en_route';
      ride.timestamps.driverEnRoute = new Date();

      await ride.save();

      // Update active ride status
      if (this.activeRides.has(rideId)) {
        this.activeRides.get(rideId).status = 'driver_en_route';
      }

      // Notify passenger
      await this.notifyRideStatusUpdate(ride, 'driver_en_route');

      console.log(`🚗 Ride ${rideId} started - driver en route`);

      return {
        success: true,
        ride: await ride.populate(['passengerId', 'driverId'])
      };

    } catch (error) {
      console.error('Error starting ride:', error);
      throw error;
    }
  }

  /**
   * Complete a ride
   * @param {string} rideId - Ride ID
   * @param {string} driverId - Driver ID
   * @param {Object} completionData - Actual distance and time
   * @returns {Object} Completed ride with final fare
   */
  async completeRide(rideId, driverId, completionData = {}) {
    try {
      const ride = await Ride.findById(rideId).populate(['passengerId', 'driverId']);
      if (!ride) {
        throw new Error('Ride not found');
      }

      if (ride.driverId._id.toString() !== driverId) {
        throw new Error('Unauthorized driver');
      }

      if (!['driver_en_route', 'arrived', 'in_progress'].includes(ride.status)) {
        throw new Error('Ride cannot be completed from current status');
      }

      // Calculate actual fare
      const actualDistance = completionData.actualDistance || ride.pricing.distance;
      const actualTime = completionData.actualTime || ride.pricing.time;

      const actualFare = FareService.calculateActualFare(
        actualDistance,
        actualTime,
        ride.pricing
      );

      // Update ride with completion data
      ride.status = 'completed';
      ride.actualDistance = actualDistance;
      ride.actualDuration = actualTime;
      ride.pricing = {
        ...ride.pricing,
        ...actualFare
      };
      ride.timestamps.completed = new Date();

      await ride.save();

      // Update driver status and earnings
      const driver = await Driver.findById(driverId);
      if (driver) {
        driver.isAvailable = true;
        driver.availabilityStatus = 'online';
        driver.totalEarnings = (driver.totalEarnings || 0) + actualFare.actualTotalFare;
        driver.totalRides = (driver.totalRides || 0) + 1;
        await driver.save();
      }

      // Update passenger stats
      const passenger = await Passenger.findById(ride.passengerId);
      if (passenger) {
        passenger.stats.totalRides = (passenger.stats.totalRides || 0) + 1;
        passenger.stats.totalSpent = (passenger.stats.totalSpent || 0) + actualFare.actualTotalFare;
        passenger.stats.lastRide = new Date();
        await passenger.save();
      }

      // Remove from active rides
      this.activeRides.delete(rideId);

      // Notify both parties
      await this.notifyRideStatusUpdate(ride, 'completed');

      console.log(`🎉 Ride ${rideId} completed`);
      console.log(`💰 Final fare: ZAR ${actualFare.actualTotalFare}`);

      return {
        success: true,
        ride,
        finalFare: actualFare.actualTotalFare,
        fareBreakdown: actualFare.breakdown
      };

    } catch (error) {
      console.error('Error completing ride:', error);
      throw error;
    }
  }

  /**
   * Cancel a ride
   * @param {string} rideId - Ride ID
   * @param {string} userId - User ID (passenger or driver)
   * @param {string} reason - Cancellation reason
   * @returns {Object} Cancellation result
   */
  async cancelRide(rideId, userId, reason = 'No reason provided') {
    try {
      const ride = await Ride.findById(rideId).populate(['passengerId', 'driverId']);
      if (!ride) {
        throw new Error('Ride not found');
      }

      // Determine who is cancelling
      let cancelledBy;
      if (ride.passengerId._id.toString() === userId) {
        cancelledBy = 'passenger';
      } else if (ride.driverId && ride.driverId._id.toString() === userId) {
        cancelledBy = 'driver';
      } else {
        throw new Error('Unauthorized user');
      }

      if (['completed', 'cancelled'].includes(ride.status)) {
        throw new Error(`Ride is already ${ride.status}`);
      }

      // Update ride status
      ride.status = 'cancelled';
      ride.cancelledBy = cancelledBy;
      ride.cancellationReason = reason;
      ride.timestamps.cancelled = new Date();

      await ride.save();

      // Clean up from active storage
      this.pendingRequests.delete(rideId);
      this.activeRides.delete(rideId);

      // Update driver availability if driver was assigned
      if (ride.driverId) {
        const driver = await Driver.findById(ride.driverId._id);
        if (driver) {
          driver.isAvailable = true;
          driver.availabilityStatus = 'online';
          await driver.save();
        }
      }

      // Notify relevant parties
      await this.notifyRideStatusUpdate(ride, 'cancelled');

      console.log(`❌ Ride ${rideId} cancelled by ${cancelledBy}: ${reason}`);

      return {
        success: true,
        ride,
        cancelledBy,
        reason
      };

    } catch (error) {
      console.error('Error cancelling ride:', error);
      throw error;
    }
  }

  /**
   * Notify about ride status update
   * @param {Object} ride - Ride object
   * @param {string} status - New status
   */
  async notifyRideStatusUpdate(ride, status) {
    try {
      await NotificationService.sendRideStatusNotification(ride, status);
    } catch (error) {
      console.error('Error sending ride status notification:', error);
    }
  }

  /**
   * Get time of day for surge pricing
   * @returns {string} 'peak' or 'off-peak'
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    return (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19) ? 'peak' : 'off-peak';
  }

  /**
   * Get count of available drivers
   * @param {Object} location - Location to check around
   * @returns {number} Available drivers count
   */
  async getAvailableDriversCount(location) {
    const drivers = await this.findNearbyDrivers(location);
    return drivers.length;
  }

  /**
   * Get active ride by ID
   * @param {string} rideId - Ride ID
   * @returns {Object} Ride data
   */
  getActiveRide(rideId) {
    return this.activeRides.get(rideId) || null;
  }

  /**
   * Get pending requests count
   * @returns {number} Pending requests count
   */
  getPendingRequestsCount() {
    return this.pendingRequests.size;
  }

  /**
   * Get active rides count
   * @returns {number} Active rides count
   */
  getActiveRidesCount() {
    return this.activeRides.size;
  }

  /**
   * Clean up expired pending requests
   */
  cleanupExpiredRequests() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [rideId, request] of this.pendingRequests.entries()) {
      if (now > request.expiryTime) {
        this.pendingRequests.delete(rideId);
        cleanedCount++;
        
        // Update ride status in database
        Ride.findByIdAndUpdate(rideId, {
          status: 'cancelled',
          cancelledBy: 'system',
          cancellationReason: 'Request expired - no drivers available',
          'timestamps.cancelled': new Date()
        }).catch(console.error);
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired ride requests`);
    }
  }
}

export default new RideService();