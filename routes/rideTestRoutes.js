// routes/rideTestRoutes.js
import express from 'express';
const router = express.Router();
import inMemoryRideService from '../services/inMemoryRideService.js';

// 🆕 ADD THESE IMPORTS FOR DISTANCE CALCULATIONS
import { 
  calculateDistance, 
  calculateEstimatedTime, 
  calculateFare, 
  calculateSurgeMultiplier 
} from '../utils/distanceCalculations.js';

// =============================================
// 🆕 DISTANCE CALCULATION TEST ROUTES
// =============================================

// Test route for distance calculations
router.post('/test-calculate-distance', (req, res) => {
  try {
    const { point1, point2 } = req.body;
    
    if (!point1 || !point2 || !point1.latitude || !point1.longitude || !point2.latitude || !point2.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Both points must have latitude and longitude'
      });
    }

    const distance = calculateDistance(
      point1.latitude,
      point1.longitude,
      point2.latitude,
      point2.longitude
    );

    const estimatedTime = calculateEstimatedTime(distance, 'moderate');

    res.json({
      success: true,
      point1,
      point2,
      distance: `${distance} km`,
      estimatedTime: `${estimatedTime} minutes`,
      calculations: {
        distance_km: distance,
        estimated_time_minutes: estimatedTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route for fare calculations
router.post('/test-calculate-fare', (req, res) => {
  try {
    const { distance, duration, vehicleType, surgeMultiplier } = req.body;
    
    if (!distance || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Distance and duration are required'
      });
    }

    const fare = calculateFare(
      parseFloat(distance),
      parseFloat(duration),
      vehicleType || 'standard',
      parseFloat(surgeMultiplier) || 1.0
    );

    res.json({
      success: true,
      input: {
        distance: `${distance} km`,
        duration: `${duration} minutes`,
        vehicleType: vehicleType || 'standard',
        surgeMultiplier: surgeMultiplier || 1.0
      },
      fare
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route for surge pricing
router.post('/test-calculate-surge', (req, res) => {
  try {
    const { availableDrivers, rideRequests, timeOfDay } = req.body;
    
    const surgeMultiplier = calculateSurgeMultiplier(
      parseInt(availableDrivers) || 10,
      parseInt(rideRequests) || 5,
      timeOfDay || 'off-peak'
    );

    res.json({
      success: true,
      input: {
        availableDrivers: availableDrivers || 10,
        rideRequests: rideRequests || 5,
        timeOfDay: timeOfDay || 'off-peak'
      },
      surgeMultiplier,
      description: surgeMultiplier === 1.0 ? 'No surge' : `${(surgeMultiplier - 1) * 100}% surge pricing`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// =============================================
// 🚗 RIDE MANAGEMENT TEST ROUTES
// =============================================

// Test route to create a ride
router.post('/test-create-ride', (req, res) => {
  try {
    const { passengerId, pickup, destination, vehicleType, paymentMethod } = req.body;

    // Basic validation
    if (!passengerId || !pickup || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: passengerId, pickup, destination'
      });
    }

    if (!pickup.address || !pickup.coordinates || !pickup.coordinates.latitude || !pickup.coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup location data'
      });
    }

    if (!destination.address || !destination.coordinates || !destination.coordinates.latitude || !destination.coordinates.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Invalid destination data'
      });
    }

    const ride = inMemoryRideService.createRide({
      passengerId,
      pickup,
      destination,
      vehicleType: vehicleType || 'standard',
      paymentMethod: paymentMethod || 'cash'
    });

    res.json({
      success: true,
      message: 'Ride created successfully in memory',
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route to get all rides
router.get('/test-all-rides', (req, res) => {
  try {
    const rides = inMemoryRideService.getAllRides();
    const stats = inMemoryRideService.getStats();

    res.json({
      success: true,
      stats,
      rides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route to get ride by ID
router.get('/test-ride/:rideId', (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = inMemoryRideService.getRideById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    res.json({
      success: true,
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route to update ride status
router.patch('/test-update-status/:rideId', (req, res) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const ride = inMemoryRideService.updateRideStatus(rideId, status);

    res.json({
      success: true,
      message: `Ride status updated to ${status}`,
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route to cancel ride with details
router.post('/test-cancel-ride/:rideId', (req, res) => {
  try {
    const { rideId } = req.params;
    const { cancelledBy, cancellationReason, cancellationFee, refundAmount } = req.body;

    if (!cancelledBy) {
      return res.status(400).json({
        success: false,
        message: 'cancelledBy is required (driver, passenger, system, admin)'
      });
    }

    const validCancelledBy = ['driver', 'passenger', 'system', 'admin'];
    if (!validCancelledBy.includes(cancelledBy)) {
      return res.status(400).json({
        success: false,
        message: `Invalid cancelledBy. Must be one of: ${validCancelledBy.join(', ')}`
      });
    }

    const ride = inMemoryRideService.cancelRide(
      rideId,
      cancelledBy,
      cancellationReason || 'No reason provided',
      cancellationFee || 0,
      refundAmount || 0
    );

    res.json({
      success: true,
      message: 'Ride cancelled successfully',
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route to get rides by passenger
router.get('/test-passenger-rides/:passengerId', (req, res) => {
  try {
    const { passengerId } = req.params;
    const rides = inMemoryRideService.getRidesByPassenger(passengerId);

    res.json({
      success: true,
      passengerId,
      rideCount: rides.length,
      rides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route to get rides eligible for rating
router.get('/test-ratable-rides/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const rides = inMemoryRideService.findRidesForRating(userId);

    res.json({
      success: true,
      userId,
      ratableRideCount: rides.length,
      rides: rides.map(ride => ({
        _id: ride._id,
        status: ride.status,
        passengerId: ride.passengerId,
        driverId: ride.driverId,
        pickup: ride.pickup,
        destination: ride.destination,
        timestamps: ride.timestamps,
        ratingStatus: ride.ratingStatus
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route to get ride statistics
router.get('/test-stats', (req, res) => {
  try {
    const stats = inMemoryRideService.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test route to clear all rides (for testing)
router.delete('/test-clear-rides', (req, res) => {
  try {
    const count = inMemoryRideService.clearAllRides();

    res.json({
      success: true,
      message: `Cleared ${count} rides from memory`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// =============================================
// ✅ EXPORT ROUTER (ONLY ONCE AT THE END)
// =============================================
export default router;