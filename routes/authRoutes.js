import express from 'express';
import { 
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  logout,
  verifyEmail
} from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import { 
  registerValidation, 
  loginValidation, 
  updateProfileValidation 
} from '../middleware/validation.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfileValidation, updateProfile);
router.put('/password', auth, updatePassword);
router.post('/logout', auth, logout);
router.post('/verify-email', auth, verifyEmail);

export default router;