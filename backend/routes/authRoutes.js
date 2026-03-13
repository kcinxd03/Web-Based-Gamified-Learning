import express from 'express';
import { register, login, getCurrentUser, updateProfile, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateProfile);

export default router;

