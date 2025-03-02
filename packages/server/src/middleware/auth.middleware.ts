import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Extend Express Request type to include user property
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email?: string;
    isAdmin: boolean;
  };
}

/**
 * Middleware to authenticate requests using session
 */
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check if the user is in the session
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }
    
    // No session, return unauthorized
    return res.status(401).json({ message: 'Authentication required' });
  } catch (error) {
    logger.error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin privileges required' });
  }

  next();
}; 