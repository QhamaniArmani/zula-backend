// routes/driverRoutes.js
import express from 'express';
import { driverController } from '../controllers/driverController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get driver profile
router.get('/profile', auth, driverController.getDriverProfile);

// Update driver profile
router.put('/profile', auth, driverController.updateDriverProfile);

// Update driver availability
router.patch('/availability', auth, driverController.updateAvailability);

// Get driver earnings
router.get('/earnings', auth, driverController.getDriverEarnings);

// Get driver statistics
router.get('/stats', auth, driverController.getDriverStats);

// Get available rides for drivers
router.get('/available-rides', auth, driverController.getAvailableRides);

export default router;