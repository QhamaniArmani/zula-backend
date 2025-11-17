// routes/ratingRoutes.js
import express from 'express';
import ratingController from '../controllers/ratingController.js';

const router = express.Router();

// Submit rating for a completed ride
router.post('/rides/:rideId/rate', ratingController.submitRating);

// Get ratings for a specific user (driver or passenger)
router.get('/users/:userId/:userType', ratingController.getUserRatings);

// Get recent ratings for dashboard
router.get('/recent', ratingController.getRecentRatings);

// Respond to a rating
router.post('/:ratingId/respond', ratingController.respondToRating);

// Flag a rating as inappropriate
router.post('/:ratingId/flag', ratingController.flagRating);

// Get rating statistics (admin)
router.get('/statistics', ratingController.getRatingStatistics);

export default router;