// socket/rideLifecycleHandlers.js
import inMemoryRideService from '../services/inMemoryRideService.js';

export function setupRideLifecycleHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected for ride lifecycle: ${socket.id}`);

    // Passenger requests a ride
    socket.on('ride:request', async (data) => {
      try {
        const { passengerId, pickup, destination, vehicleType } = data;
        console.log(`📱 Passenger ${passengerId} requesting ride`);
        
        // Create ride in memory using your complete service
        const ride = inMemoryRideService.createRide({
          passengerId,
          pickup,
          destination,
          vehicleType: vehicleType || 'standard'
        });

        // Notify passenger
        socket.emit('ride:requested', {
          success: true,
          ride,
          message: 'Ride requested successfully'
        });

        // Notify all drivers about new ride request
        io.emit('ride:new_request', {
          rideId: ride._id,
          passengerId,
          pickup,
          destination,
          vehicleType: ride.vehicleType,
          pricing: ride.pricing,
          timestamp: new Date()
        });

        console.log(`🚗 Ride ${ride._id} requested - notified all drivers`);

      } catch (error) {
        socket.emit('ride:request_failed', {
          success: false,
          message: error.message
        });
      }
    });

    // Driver accepts a ride
    socket.on('ride:accept', async (data) => {
      try {
        const { rideId, driverId } = data;
        console.log(`🚖 Driver ${driverId} accepting ride ${rideId}`);
        
        // Update ride with driver assignment using your complete service
        const ride = inMemoryRideService.updateRideStatus(rideId, 'accepted');
        const updatedRide = inMemoryRideService.updateRide(rideId, {
          driverId
        });

        // Notify driver
        socket.emit('ride:accepted', {
          success: true,
          ride: updatedRide,
          message: 'Ride accepted successfully'
        });

        // Notify passenger
        io.emit(`passenger:${ride.passengerId}:ride_accepted`, {
          ride: updatedRide,
          driverId,
          message: 'Driver has accepted your ride'
        });

        // Notify other drivers that ride is taken
        io.emit('ride:accepted_by_other', {
          rideId,
          driverId
        });

        console.log(`✅ Ride ${rideId} accepted by driver ${driverId}`);

      } catch (error) {
        socket.emit('ride:accept_failed', {
          success: false,
          message: error.message
        });
      }
    });

    // Driver starts the ride (picked up passenger)
    socket.on('ride:start', async (data) => {
      try {
        const { rideId } = data;
        console.log(`🚦 Starting ride ${rideId}`);
        
        const ride = inMemoryRideService.updateRideStatus(rideId, 'in_progress');

        // Notify passenger
        io.emit(`passenger:${ride.passengerId}:ride_started`, {
          ride,
          message: 'Your ride has started'
        });

        socket.emit('ride:started', {
          success: true,
          ride
        });

        console.log(`🎬 Ride ${rideId} started`);

      } catch (error) {
        socket.emit('ride:start_failed', {
          success: false,
          message: error.message
        });
      }
    });

    // Driver completes the ride
    socket.on('ride:complete', async (data) => {
      try {
        const { rideId, actualDistance, actualDuration } = data;
        console.log(`🏁 Completing ride ${rideId}`);
        
        const ride = inMemoryRideService.updateRideStatus(rideId, 'completed');

        // Update with actual metrics if provided
        if (actualDistance || actualDuration) {
          inMemoryRideService.updateRide(rideId, {
            actualDistance: actualDistance || ride.actualDistance,
            actualDuration: actualDuration || ride.actualDuration
          });
        }

        // Get the final updated ride
        const finalRide = inMemoryRideService.getRideById(rideId);

        // Notify both parties
        io.emit(`passenger:${ride.passengerId}:ride_completed`, {
          ride: finalRide,
          message: 'Ride completed successfully'
        });

        io.emit(`driver:${ride.driverId}:ride_completed`, {
          ride: finalRide,
          message: 'Ride completed successfully'
        });

        socket.emit('ride:completed', {
          success: true,
          ride: finalRide
        });

        console.log(`✅ Ride ${rideId} completed`);

      } catch (error) {
        socket.emit('ride:complete_failed', {
          success: false,
          message: error.message
        });
      }
    });

    // Cancel ride
    socket.on('ride:cancel', async (data) => {
      try {
        const { rideId, cancelledBy, reason, cancellationFee = 0, refundAmount = 0 } = data;
        console.log(`❌ Cancelling ride ${rideId} by ${cancelledBy}`);
        
        const ride = inMemoryRideService.cancelRide(
          rideId,
          cancelledBy,
          reason,
          cancellationFee,
          refundAmount
        );

        // Notify both parties
        if (ride.passengerId) {
          io.emit(`passenger:${ride.passengerId}:ride_cancelled`, {
            ride,
            message: 'Ride has been cancelled'
          });
        }

        if (ride.driverId) {
          io.emit(`driver:${ride.driverId}:ride_cancelled`, {
            ride,
            message: 'Ride has been cancelled'
          });
        }

        socket.emit('ride:cancelled', {
          success: true,
          ride
        });

        console.log(`❌ Ride ${rideId} cancelled by ${cancelledBy}`);

      } catch (error) {
        socket.emit('ride:cancel_failed', {
          success: false,
          message: error.message
        });
      }
    });

    // Driver location updates during ride
    socket.on('ride:location_update', (data) => {
      const { rideId, driverId, passengerId, location, heading, speed } = data;
      
      // Broadcast to passenger
      io.emit(`passenger:${passengerId}:driver_location`, {
        rideId,
        location,
        heading,
        speed,
        timestamp: new Date()
      });

      console.log(`📍 Driver ${driverId} location update for ride ${rideId}`);
    });

    // Join passenger room for targeted messaging
    socket.on('passenger:join', (passengerId) => {
      socket.join(`passenger:${passengerId}`);
      console.log(`👤 Passenger ${passengerId} joined their room`);
    });

    // Join driver room for targeted messaging
    socket.on('driver:join', (driverId) => {
      socket.join(`driver:${driverId}`);
      console.log(`🚗 Driver ${driverId} joined their room`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected from ride lifecycle: ${socket.id}`);
    });
  });
}