import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getUserRideHistory,
  getDriverRideHistory,
  getRideHistoryById,
  getRideStatistics,
  exportRideHistory
} from '../controllers/rideHistoryController.js';

const router = express.Router();

// All routes protected
router.use(protect);

// Ride history routes
router.get('/user', getUserRideHistory);
router.get('/driver', getDriverRideHistory);
router.get('/statistics', getRideStatistics);
router.get('/export', exportRideHistory);
router.get('/:id', getRideHistoryById);

export default router;
