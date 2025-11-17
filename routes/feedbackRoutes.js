import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  submitFeedback,
  getFeedback,
  getFeedbackByRide,
  updateFeedback,
  deleteFeedback,
  getDriverFeedback,
  getAverageRatings
} from '../controllers/feedbackController.js';

const router = express.Router();

// All routes protected
router.use(protect);

// Feedback CRUD
router.post('/', submitFeedback);
router.get('/', getFeedback);
router.get('/ride/:rideId', getFeedbackByRide);
router.get('/driver/:driverId', getDriverFeedback);
router.get('/ratings/average', getAverageRatings);
router.put('/:id', updateFeedback);
router.delete('/:id', deleteFeedback);

export default router;
