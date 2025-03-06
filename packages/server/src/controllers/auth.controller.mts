import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserModel, UserDocument } from '../models/user.model.mjs';
import { config } from '../config/index.mjs';
import { logger } from '../utils/logger.mjs';
import { IUser } from '@dungeon-lab/shared/index.mjs';

/**
 * Format user data for response
 */
function formatUserResponse(user: UserDocument) {
  return {
    id: (user._id as mongoose.Types.ObjectId).toString(),
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
  };
}

/**
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      res.status(400).json({ message: 'Username or email already exists' });
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
      preferences: user.preferences
    };

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    logger.error('Error registering user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await UserModel.findOne({ username });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Set session data
    req.session.user = {
      id: (user._id as mongoose.Types.ObjectId).toString(),
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      preferences: user.preferences
    };

    res.json({ message: 'Login successful' });
  } catch (error) {
    logger.error('Error logging in:', error);
    res.status(500).json({ message: 'Error during login' });
  }
}

/**
 * Google authentication callback
 */
export async function googleCallback(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user as IUser;
    if (!user) {
      res.status(401).json({ message: 'Authentication failed' });
      return;
    }

    // Set session data
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      preferences: user.preferences
    };

    // Redirect to frontend
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  } catch (error) {
    logger.error('Error in Google callback:', error);
    res.status(500).json({ message: 'Error during Google authentication' });
  }
}

/**
 * Logout - clears the session
 */
export async function logout(req: Request, res: Response): Promise<void> {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error destroying session:', err);
      res.status(500).json({ message: 'Error during logout' });
      return;
    }
    res.json({ message: 'Logout successful' });
  });
}

/**
 * Get current user
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // Check for user in session
    if (req.session && req.session.user) {
      const userId = req.session.user.id;
      
      const user = await UserModel.findById(userId).select('-password');
      
      if (user) {
        return res.status(200).json({
          success: true,
          data: formatUserResponse(user),
        });
      }
    }
    
    // No user in session
    return res.status(401).json({
      success: false,
      error: {
        message: 'Not authenticated',
      },
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'An error occurred while fetching user data',
      },
    });
  }
} 