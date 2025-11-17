// routes/index.js
import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import driverRoutes from './driverRoutes.js';
import rideRoutes from './rideRoutes.js';
import ratingRoutes from './ratingRoutes.js';
import walletRoutes from './walletRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import feedbackRoutes from './feedbackRoutes.js'; 
import historyRoutes from './historyRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/rides', rideRoutes);
router.use('/ratings', ratingRoutes);
router.use('/wallet', walletRoutes);
router.use('/payments', paymentRoutes); // Add this line
router.use('/feedback', feedbackRoutes);
router.use('/history', historyRoutes);

export default router;