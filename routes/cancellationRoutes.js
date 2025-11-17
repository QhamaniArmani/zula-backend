// routes/cancellationRoutes.js
import express from 'express';
import cancellationController from '../controllers/cancellationController.js';

const router = express.Router();

// Cancel a ride
router.post('/rides/:rideId/cancel', cancellationController.cancelRide);

// Process refund for cancelled ride
router.post('/rides/:rideId/refund', cancellationController.processRefund);

// Get cancellation statistics
router.get('/statistics', cancellationController.getCancellationStats);

// Get cancellation policy
router.get('/policy', cancellationController.getCancellationPolicy);

// Update cancellation policy (admin)
router.put('/policy/:policyId', cancellationController.updateCancellationPolicy);

// Get pending refunds
router.get('/refunds/pending', cancellationController.getPendingRefunds);

export default router;