import express from 'express';
import {
  createRide,
  updateRideStatus,
  assignDriver,
  completeRide,
  cancelRide,
  getRidePayment,
  updatePaymentMethod
} from '../controllers/rideController.js';

const router = express.Router();

// Create a new ride
router.post('/', createRide);

// Update ride status
router.put('/:id/status', updateRideStatus);

// Assign driver to ride
router.post('/:id/assign-driver', assignDriver);

// Complete ride and process payment
router.post('/:id/complete', completeRide);

// Cancel ride with refund handling
router.post('/:id/cancel', cancelRide);

// Get ride payment details
router.get('/:id/payment', getRidePayment);

// Update payment method for a ride
router.put('/:id/payment', updatePaymentMethod);

// Get ride by ID
router.get('/:id', async (req, res) => {
  try {
    const Ride = (await import('../models/Ride.js')).default;
    const ride = await Ride.findById(req.params.id)
      .populate('passengerId')
      .populate('driverId');
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    res.json({
      success: true,
      data: ride
    });
  } catch (error) {
    console.error('Error getting ride:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving ride'
    });
  }
});

// Get ride history for user
router.get('/user/:userId', async (req, res) => {
  try {
    const Ride = (await import('../models/Ride.js')).default;
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const rides = await Ride.find({
      $or: [
        { passengerId: userId },
        { driverId: userId }
      ]
    })
    .populate('passengerId', 'name email')
    .populate('driverId', 'name email vehicle')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Ride.countDocuments({
      $or: [
        { passengerId: userId },
        { driverId: userId }
      ]
    });

    res.json({
      success: true,
      data: {
        rides,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting ride history:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving ride history'
    });
  }
});

export default router;