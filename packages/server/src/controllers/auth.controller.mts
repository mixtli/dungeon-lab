import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { UserModel } from '../models/user.model.mjs';
import { logger } from '../utils/logger.mjs';
import { IUser } from '@dungeon-lab/shared/types/index.mjs';
import { userPreferencesSchema } from '@dungeon-lab/shared/schemas/user.schema.mjs';
import {
  LoginRequest,
  loginRequestSchema,
  LoginResponse,
  RegisterRequest,
  registerRequestSchema,
  RegisterResponse,
  LogoutResponse,
  GoogleCallbackResponse,
  GetCurrentUserResponse,
  GetApiKeyResponse
} from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Format user data for response
 */
function formatUserResponse(user: IUser): LoginResponse['user'] {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    preferences: user.preferences,
    profile: user.profile || {}
  };
}

/**
 * Register a new user
 */
export async function register(
  req: Request<object, object, RegisterRequest>,
  res: Response<RegisterResponse>
): Promise<void> {
  try {
    const { username, email, password } = registerRequestSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Username or email already exists' });
      return;
    }

    // Create new user
    const user = await UserModel.create({
      username,
      email,
      password,
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: true
      }
    });

    // Set session data
    req.session.user = {
      id: (user._id as mongoose.Types.ObjectId).toString(),
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      preferences: user.preferences,
      profile: user.profile || {}
    };

    res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error) {
    logger.error('Error registering user:', error);
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: JSON.parse(error.message)
      });
      return;
    }
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
}

/**
 * Login user
 */
export async function login(
  req: Request<object, object, LoginRequest>,
  res: Response<LoginResponse>
): Promise<void> {
  logger.debug('Login attempt for user:', req.body?.email || 'unknown');
  try {
    const { email, password } = loginRequestSchema.parse(req.body);
    // Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Check password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Set session data
    req.session.user = {
      id: (user._id as mongoose.Types.ObjectId).toString(),
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      preferences: user.preferences,
      profile: user.profile || {}
    };

    res.json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    logger.error('Error logging in:', error);
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: JSON.parse(error.message)
      });
      return;
    }
    res.status(400).json({
      success: false,
      error: 'Invalid request body'
    });
    return;
    res.status(500).json({
      success: false,
      error: 'Error during login'
    });
  }
}

/**
 * Google authentication callback
 */
export async function googleCallback(
  req: Request,
  res: Response<GoogleCallbackResponse>
): Promise<void> {
  try {
    const user = req.user as IUser;
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication failed'
        }
      });
      return;
    }

    // Set session data
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      preferences: user.preferences,
      profile: user.profile || {}
    };

    // Get the full user from the database to include all fields
    const dbUser = await UserModel.findById(user.id).select('-password');
    if (!dbUser) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not found'
        }
      });
      return;
    }

    // Redirect to frontend with success flag in query params
    res.redirect(
      `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/google/callback?success=true`
    );
  } catch (error) {
    logger.error('Error in Google callback:', error);
    res.redirect(
      `${process.env.CLIENT_URL || 'http://localhost:5173'}/auth/google/callback?success=false`
    );
  }
}

/**
 * Logout - clears the session
 */
export async function logout(req: Request, res: Response<LogoutResponse>): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error destroying session:', err);
      res.status(500).json({ success: false, message: 'Error during logout' });
      return;
    }
    res.json({ success: true, message: 'Logout successful' });
  });
}

/**
 * Get current user
 */
export async function getCurrentUser(req: Request, res: Response<GetCurrentUserResponse>) {
  try {
    // Check for user in session
    if (req.session && req.session.user) {
      const userId = req.session.user.id;

      const user = await UserModel.findById(userId).select('-password');

      if (user) {
        return res.status(200).json({
          success: true,
          data: formatUserResponse(user)
        });
      }
    }

    // No user in session
    // This code should never be reached.  If the user is not authenticated, the middleware should have returned a 401.
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching user data'
    });
  }
}

/**
 * Update current user's profile (displayName, profile fields, and preferences)
 */
export async function updateCurrentUserProfile(req: Request, res: Response) {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const userId = req.session.user.id;
    const { displayName, profile, preferences } = req.body;
    
    // Build update object with allowed fields
    const update: Record<string, unknown> = {};
    
    // Handle displayName
    if (typeof displayName === 'string') {
      update.displayName = displayName;
    }
    
    // Handle profile
    if (profile && typeof profile === 'object') {
      update.profile = profile;
    }
    
    // Handle preferences with validation
    if (preferences && typeof preferences === 'object') {
      try {
        // Validate preferences against schema
        const validatedPreferences = userPreferencesSchema.parse(preferences);
        update.preferences = validatedPreferences;
        logger.info('User preferences validated successfully:', { userId, preferences: validatedPreferences });
      } catch (validationError) {
        logger.warn('Invalid user preferences submitted:', { 
          userId, 
          error: validationError instanceof ZodError ? validationError.errors : validationError 
        });
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid preferences data',
          details: validationError instanceof ZodError ? validationError.errors : 'Validation failed'
        });
      }
    }
    
    // Update user in database
    const user = await UserModel.findByIdAndUpdate(userId, update, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Update session data to reflect new preferences
    if (req.session.user && update.preferences) {
      req.session.user.preferences = user.preferences;
      logger.info('Session preferences updated for user:', { userId });
    }
    
    logger.info('User profile updated successfully:', { userId, updatedFields: Object.keys(update) });
    return res.status(200).json(user);
  } catch (error) {
    logger.error('Error updating current user profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
}

/**
 * Get user's API key
 */
export async function getApiKey(req: Request, res: Response<GetApiKeyResponse>) {
  try {
    // Check for user in session
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const userId = req.session.user.id;
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: { apiKey: user.apiKey || '' }
    });
  } catch (error) {
    logger.error('Get API key error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching API key'
    });
  }
}
