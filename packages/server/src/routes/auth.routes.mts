import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.mjs';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { openApiPost, openApiGet } from '../oapi.mjs';
import { z } from '../utils/zod.mjs';
import {
  loginRequestSchema,
  loginResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  logoutResponseSchema,
  getCurrentUserResponseSchema,
  getApiKeyResponseSchema
} from '@dungeon-lab/shared/types/api/index.mjs';
import { createSchema } from 'zod-openapi';
import { updateCurrentUserProfile } from '../controllers/auth.controller.mjs';

const router = Router();
//router.use(errorHandler);

// Public routes
router.post(
  '/register',
  openApiPost(registerRequestSchema, {
    description: 'Register a new user account',
    responses: {
      201: {
        description: 'User registered successfully',
        content: {
          'application/json': {
            schema: createSchema(
              registerResponseSchema.openapi({
                description: 'Register response'
              })
            )
          }
        }
      },
      400: { description: 'Invalid registration data' },
      409: { description: 'Username or email already exists' },
      500: { description: 'Server error' }
    }
  }),
  authController.register
);
router.post(
  '/login',
  openApiPost(loginRequestSchema, {
    description: 'Login with email and password',
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: createSchema(
              loginResponseSchema.openapi({
                description: 'Login response'
              })
            )
          }
        }
      },
      401: { description: 'Invalid credentials' }
    }
  }),
  authController.login
);

router.post(
  '/logout',
  openApiPost(z.object({}), {
    description: 'Log out the current user',
    responses: {
      200: {
        description: 'Logout successful',
        content: {
          'application/json': {
            schema: createSchema(
              logoutResponseSchema.openapi({
                description: 'Logout response'
              })
            )
          }
        }
      },
      500: { description: 'Server error' }
    }
  }),
  authController.logout
);

// Google OAuth routes
router.get(
  '/google',
  openApiGet(z.object({}), {
    description: 'Initiate Google OAuth authentication flow'
  }),
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

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
router.get(
  '/me',
  authenticate,
  openApiGet(z.object({}), {
    description: 'Get the currently authenticated user profile',
    responses: {
      200: {
        description: 'Current user profile',
        content: {
          'application/json': {
            schema: createSchema(
              getCurrentUserResponseSchema.openapi({
                description: 'Current user response'
              })
            )
          }
        }
      },
      401: { description: 'Not authenticated' },
      500: { description: 'Server error' }
    }
  }),
  authController.getCurrentUser
);

// PATCH /me - update current user's profile
router.patch(
  '/me',
  authenticate,
  updateCurrentUserProfile
);

// Get API key
router.get(
  '/api-key',
  authenticate,
  openApiGet(z.object({}), {
    description: 'Get the API key for the authenticated user',
    responses: {
      200: {
        description: 'User API key',
        content: {
          'application/json': {
            schema: createSchema(
              getApiKeyResponseSchema.openapi({
                description: 'API key response'
              })
            )
          }
        }
      },
      401: { description: 'Not authenticated' },
      404: { description: 'User not found' },
      500: { description: 'Server error' }
    }
  }),
  authController.getApiKey
);

export default router;
