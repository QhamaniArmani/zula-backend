// routes/analyticsRoutes.js
import express from 'express';
import {
  getPlatformAnalytics,
  getDriverEarningsReport,
  generateDailyAnalytics,
  getDashboardOverview,
  getDriverDashboard
} from '../controllers/analyticsController.js';

const router = express.Router();

// Platform analytics
router.get('/platform', getPlatformAnalytics);
router.get('/dashboard/overview', getDashboardOverview);
router.post('/generate/daily', generateDailyAnalytics);

// Driver analytics
router.get('/driver/:driverId/earnings', getDriverEarningsReport);
router.get('/driver/:driverId/dashboard', getDriverDashboard);

export default router;