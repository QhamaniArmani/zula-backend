// services/socketRideHandlers.js
import RideService from './rideService.js';
import { calculateDistance } from '../utils/geoUtils.js';

class SocketRideHandlers {
  constructor(io) {
    this.io = io;
  }

  /**
   * Initialize socket event handlers
   */
  initializeHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 User connected: ${socket.id}`);

      // Ride request event
      socket.on('request-ride', async (data) => {
        await this.handleRideRequest(socket, data);
      });

      // Ride acceptance event
      socket.on('accept-ride', async (data) => {
        await this.handleRideAcceptance(socket, data);
      });

      // Ride status update events
      socket.on('start-ride', async (data) => {
        await this.handleRideStart(socket, data);
      });

      socket.on('complete-ride', async (data) => {
        await this.handleRideCompletion(socket, data);
      });

      socket.on('cancel-ride', async (data) => {
        await this.handleRideCancellation(socket, data);
      });

      // Driver location updates during ride
      socket.on('update-ride-location', async (data) => {
        await this.handleLocationUpdate(socket, data);
      });

      // Passenger tracking ride
      socket.on('track-ride', async (data) => {
        await this.handleRideTracking(socket, data);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);
      });
    });

    // Clean up expired requests every minute
    setInterval(() => {
      RideService.cleanupExpiredRequests();
    }, 60000);

    console.log('✅ Socket ride handlers initialized');
  }

  /**
   * Handle ride request from passenger
   */
  async handleRideRequest(socket, data) {
    try {
      const { passengerId, pickup, destination, vehicleType } = data;

      const result = await RideService.requestRide({
        passengerId,
        pickup,
        destination,
        vehicleType
      });

      // Join ride room for real-time updates
      socket.join(`ride-${result.ride._id}`);
      socket.join(`passenger-${passengerId}`);

      // Send confirmation to passenger
      socket.emit('ride-requested', {
        success: true,
        ride: result.ride,
        estimatedFare: result.fareEstimate,
        nearbyDrivers: result.nearbyDrivers
      });

      console.log(`🚗 Ride requested via socket: ${result.ride._id}`);

    } catch (error) {
      console.error('Error handling ride request:', error);
      socket.emit('ride-request-error', {
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Handle ride acceptance by driver
   */
  async handleRideAcceptance(socket, data) {
    try {
      const { rideId, driverId } = data;

      const result = await RideService.acceptRide(rideId, driverId);

      // Join ride room
      socket.join(`ride-${rideId}`);
      socket.join(`driver-${driverId}`);

      // Notify passenger
      this.io.to(`passenger-${result.ride.passengerId._id}`).emit('ride-accepted', {
        success: true,
        ride: result.ride,
        driver: result.driver
      });

      // Notify driver
      socket.emit('ride-acceptance-confirmed', {
        success: true,
        ride: result.ride
      });

      console.log(`✅ Ride accepted via socket: ${rideId} by driver ${driverId}`);

    } catch (error) {
      console.error('Error handling ride acceptance:', error);
      socket.emit('ride-acceptance-error', {
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Handle ride start (driver en route)
   */
  async handleRideStart(socket, data) {
    try {
      const { rideId, driverId } = data;

      const result = await RideService.startRide(rideId, driverId);

      // Notify passenger
      this.io.to(`passenger-${result.ride.passengerId._id}`).emit('driver-en-route', {
        ride: result.ride,
        driverLocation: data.driverLocation
      });

      socket.emit('ride-started', {
        success: true,
        ride: result.ride
      });

      console.log(`🚗 Ride started via socket: ${rideId}`);

    } catch (error) {
      console.error('Error handling ride start:', error);
      socket.emit('ride-start-error', {
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Handle ride completion
   */
  async handleRideCompletion(socket, data) {
    try {
      const { rideId, driverId, actualDistance, actualTime } = data;

      const result = await RideService.completeRide(rideId, driverId, {
        actualDistance,
        actualTime
      });

      // Notify both parties
      this.io.to(`ride-${rideId}`).emit('ride-completed', {
        success: true,
        ride: result.ride,
        finalFare: result.finalFare,
        fareBreakdown: result.fareBreakdown
      });

      console.log(`🎉 Ride completed via socket: ${rideId}`);

    } catch (error) {
      console.error('Error handling ride completion:', error);
      socket.emit('ride-completion-error', {
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Handle ride cancellation
   */
  async handleRideCancellation(socket, data) {
    try {
      const { rideId, userId, reason } = data;

      const result = await RideService.cancelRide(rideId, userId, reason);

      // Notify relevant parties
      this.io.to(`ride-${rideId}`).emit('ride-cancelled', {
        success: true,
        ride: result.ride,
        cancelledBy: result.cancelledBy,
        reason: result.reason
      });

      console.log(`❌ Ride cancelled via socket: ${rideId} by ${result.cancelledBy}`);

    } catch (error) {
      console.error('Error handling ride cancellation:', error);
      socket.emit('ride-cancellation-error', {
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Handle driver location updates during ride
   */
  async handleLocationUpdate(socket, data) {
    try {
      const { rideId, driverId, location } = data;

      // Verify driver is part of this ride
      const activeRide = RideService.getActiveRide(rideId);
      if (!activeRide || activeRide.driverId !== driverId) {
        return;
      }

      // Broadcast location to passenger
      this.io.to(`passenger-${activeRide.passengerId}`).emit('driver-location-update', {
        rideId,
        location,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  /**
   * Handle passenger tracking ride
   */
  async handleRideTracking(socket, data) {
    try {
      const { rideId, passengerId } = data;

      // Verify passenger is part of this ride
      const activeRide = RideService.getActiveRide(rideId);
      if (!activeRide || activeRide.passengerId !== passengerId) {
        return;
      }

      // Join ride