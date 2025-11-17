import express from 'express';
import {
  getFareEstimate,
  updatePricingModel,
  createSurgePricing,
  getActiveSurgeAreas
} from '../controllers/pricingController.js';

const router = express.Router();

// Fare estimation
router.post('/estimate', getFareEstimate);

// Admin routes for managing pricing
router.patch('/models/:vehicleType', updatePricingModel);
router.post('/surge', createSurgePricing);
router.get('/surge/active', getActiveSurgeAreas);

export default router;