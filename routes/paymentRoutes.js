// routes/paymentRoutes.js
import express from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Process payment for completed ride
router.post('/process', auth, paymentController.processRidePayment);

// Get payment history
router.get('/history', auth, paymentController.getPaymentHistory);

// Get payment details
router.get('/:paymentId', auth, paymentController.getPaymentDetails);

export default router;