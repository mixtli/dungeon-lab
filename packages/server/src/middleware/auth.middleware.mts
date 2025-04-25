import { Request, Response, NextFunction } from 'express';
import { IUser } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../utils/logger.mjs';
import { UserModel } from '../models/user.model.mjs';

// Extend Express Session type to include user
declare module 'express-session' {
  interface Session {
    user: IUser;
  }
}

/**
 * Middleware to authenticate requests using session or API key
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> {
  // Check if already authenticated via session
  if (req.session.user) {
    return next();
  }

  // Check for API key in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Find user with this API key
      const user = await UserModel.findOne({ apiKey });

      if (user) {
        // Temporarily set the user in the session for this request
        req.session.user = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          preferences: user.preferences
        };
        return next();
      }
    } catch (error) {
      logger.error('API key authentication error:', error);
    }
  }

  // No valid session or API key
  logger.warn('Unauthorized access attempt');
  return res.status(401).json({ message: 'Unauthorized' });
}

/**
 * Middleware to check if user is an admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void | Response {
  if (!req.session.user) {
    logger.warn('Unauthorized access attempt');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!req.session.user.isAdmin) {
    logger.warn('Non-admin user attempted admin action');
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
}
