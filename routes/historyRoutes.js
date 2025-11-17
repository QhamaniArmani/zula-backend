// routes/historyRoutes.js
import express from 'express';
import { historyController } from '../controllers/historyController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get ride history with filtering
router.get('/rides', auth, historyController.getRideHistory);

// Get ride analytics
router.get('/analytics', auth, historyController.getRideAnalytics);

// Get ride statistics
router.get('/statistics', auth, historyController.getRideStatistics);

// Export ride history
router.get('/export', auth, historyController.exportRideHistory);

// Search rides
router.get('/search', auth, historyController.searchRides);

// 🆕 Get popular routes
router.get('/popular-routes', auth, historyController.getPopularRoutes);

// 🆕 Get payment statistics
router.get('/payment-stats', auth, historyController.getPaymentStats);

export default router;