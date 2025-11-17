// routes/feedbackRoutes.js
import express from 'express';
import { feedbackController } from '../controllers/feedbackController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Submit passenger feedback for a ride
router.post('/:rideId/passenger', auth, feedbackController.submitPassengerFeedback);

// Submit driver feedback for a ride
router.post('/:rideId/driver', auth, feedbackController.submitDriverFeedback);

// Get feedback for a specific ride
router.get('/ride/:rideId', auth, feedbackController.getRideFeedback);

// Get user's feedback history
router.get('/history', auth, feedbackController.getFeedbackHistory);

// Get feedback statistics
router.get('/stats', auth, feedbackController.getFeedbackStats);

// Flag feedback for moderation
router.post('/:feedbackId/flag', auth, feedbackController.flagFeedback);

export default router;