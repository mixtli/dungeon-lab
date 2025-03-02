import { Request, Response } from 'express';
import { UserModel } from '../models/user.model.js';
import { config } from '../config/index.js';
import { SessionData } from 'express-session';

// Extend express-session with our custom properties
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      email?: string;
      isAdmin: boolean;
    };
  }
}

/**
 * Format user data for response
 */
function formatUserResponse(user: any) {
  return {
    id: user._id,
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
export async function register(req: Request, res: Response) {
  try {
    const { username, email, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User with this email or username already exists',
        },
      });
    }

    // Create new user
    const user = new UserModel({
      username,
      email,
      password, // Will be hashed by the pre-save hook
      displayName: displayName || username,
    });

    await user.save();

    // Set user in session
    if (req.session) {
      req.session.user = {
        id: user._id?.toString() || '',
        username: user.username || '',
        email: user.email,
        isAdmin: !!user.isAdmin,
      };
    }

    // Return user data (without password)
    return res.status(201).json({
      success: true,
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'An error occurred during registration',
      },
    });
  }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password',
        },
      });
    }

    // Set user in session
    if (req.session) {
      req.session.user = {
        id: user._id?.toString() || '',
        username: user.username || '',
        email: user.email,
        isAdmin: !!user.isAdmin,
      };
    }

    // Return user data (without password)
    return res.status(200).json({
      success: true,
      data: {
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'An error occurred during login',
      },
    });
  }
}

/**
 * Google authentication callback
 */
export function googleCallback(req: Request, res: Response) {
  try {
    // User should be attached to request by Passport
    const user = req.user;
    
    if (!user) {
      return res.redirect(`${config.clientUrl}/auth/login?error=Authentication failed`);
    }
    
    // Set user in session
    if (req.session) {
      req.session.user = user;
    }
    
    // Redirect to client
    return res.redirect(`${config.clientUrl}/auth/google/callback`);
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect(`${config.clientUrl}/auth/login?error=Authentication failed`);
  }
}

/**
 * Logout - clears the session
 */
export function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to logout',
        },
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
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
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'An error occurred while fetching user data',
      },
    });
  }
} 