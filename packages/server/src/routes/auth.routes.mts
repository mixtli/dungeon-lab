import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.mjs';
import { authenticate } from '../middleware/auth.middleware.mjs';
import { userSchema, userCreateSchema } from '@dungeon-lab/shared/schemas/user.schema.mjs';
import { openApiPost, openApiGet } from '../oapi.mjs';
import { NextFunction, Request, Response } from 'express';
import { z } from '../utils/zod.mjs';
import {
  loginRequestSchema,
  loginResponseSchema
} from '@dungeon-lab/shared/types/api/authentication.mjs';
import { createSchema } from 'zod-openapi';

const router = Router();
//router.use(errorHandler);

// Public routes
router.post(
  '/register',
  openApiPost(userCreateSchema, {
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
      200: { description: 'Logout successful' }
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
            schema: userSchema.omit({ password: true })
          }
        }
      }
    }
  }),
  authController.getCurrentUser
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
            schema: z.object({
              apiKey: z.string()
            })
          }
        }
      }
    }
  }),
  authController.getApiKey
);

export default router;
