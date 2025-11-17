import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  initiateTopup,
  processTopup,
  getTopupHistory,
  getTopupById
} from '../controllers/walletTopupController.js';

const router = express.Router();

// All routes protected
router.use(protect);

router.post('/initiate', initiateTopup);
router.post('/:id/process', processTopup);
router.get('/history', getTopupHistory);
router.get('/:id', getTopupById);

export default router;
