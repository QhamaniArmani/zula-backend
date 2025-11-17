import express from 'express';
import { 
  getWalletBalance, 
  topUpWallet, 
  getTransactionHistory,
  refundToWallet,
  getWalletStats,
  createWallet
} from '../controllers/walletController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all wallet routes
// Remove userId from routes since we get it from auth middleware
router.use(auth);

// Wallet routes
router.get('/balance', getWalletBalance);
router.post('/top-up', topUpWallet);
router.get('/transactions', getTransactionHistory);
router.post('/refund', refundToWallet);
router.get('/stats', getWalletStats);
router.post('/create', createWallet);

// If you need the old route structure with userId params, you can keep them but update the functions:
// router.get('/:userId/balance', getWalletBalance);
// router.post('/:userId/topup', topUpWallet);
// router.get('/:userId/transactions', getTransactionHistory);
// router.post('/:userId/refund', refundToWallet);

// Note: The deductFromWallet and processRidePayment functions don't exist in the updated controller
// You'll need to either:
// 1. Remove these routes temporarily, or
// 2. Add those functions to the walletController

export default router;