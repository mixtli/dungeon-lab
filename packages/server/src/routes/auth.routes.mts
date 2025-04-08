import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.mjs';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { userSchema, userCreateSchema } from '@dungeon-lab/shared/schemas/user.schema.mjs';
import { openApiPost, openApiGet } from '../oapi.mjs';
import { z } from '@dungeon-lab/shared/lib/zod.mjs';

const router = Router();

// Login schema for OpenAPI docs
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Public routes
router.post('/register', openApiPost(userCreateSchema, {
  description: 'Register a new user account',
  responses: {
    201: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: userSchema.omit({ password: true })
        }
      }
    }
  }
}), authController.register);

router.post('/login', openApiPost(loginSchema, {
  description: 'Login with email and password',
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: userSchema.omit({ password: true })
        }
      }
    },
    401: { description: 'Invalid credentials' }
  }
}), authController.login);

router.post('/logout', openApiPost(z.object({}), {
  description: 'Log out the current user',
  responses: {
    200: { description: 'Logout successful' }
  }
}), authController.logout);

// Google OAuth routes
router.get('/google', openApiGet(z.object({}), {
  description: 'Initiate Google OAuth authentication flow'
}), passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  openApiGet(z.object({}), {
    description: 'Google OAuth callback endpoint',
    parameters: [
      { name: 'code', in: 'query', schema: { type: 'string' } },
      { name: 'state', in: 'query', schema: { type: 'string' } }
    ]
  }),
  passport.authenticate('google', { session: true, failureRedirect: '/login' }),
  authController.googleCallback
);

// Protected routes
router.get('/me', authenticate, openApiGet(z.object({}), {
  description: 'Get the currently authenticated user profile',
  responses: {
    200: {
      description: 'Current user profile',
      content: {
        'application/json': {
          schema: userSchema.omit({ password: true })
        }
      }
    }
  }
}), authController.getCurrentUser);

export default router; 