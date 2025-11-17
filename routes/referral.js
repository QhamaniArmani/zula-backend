const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const referralController = require('../controllers/referralController');

// Generate referral code
router.post('/generate-code', auth, referralController.generateReferralCode);

// Get user referral info
router.get('/my-referrals', auth, referralController.getUserReferralInfo);

// Validate referral code
router.get('/validate/:code', (req, res) => {
  // Public endpoint to validate referral codes
});

module.exports = router;