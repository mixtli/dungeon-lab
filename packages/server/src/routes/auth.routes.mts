import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.mjs';
import { authenticate } from '../middleware/auth.middleware.mjs';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: true, failureRedirect: '/login' }),
  authController.googleCallback
);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);

export default router; 