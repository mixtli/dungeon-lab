import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
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
 * Middleware to authenticate requests using session or JWT
 */
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // First, check if the user is in the session
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }
    
    // If not in session, try JWT token (for backward compatibility)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication token missing' });
    }

    // Verify token
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret) as {
      id: string;
      username: string;
      email?: string;
      isAdmin: boolean;
    };

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(401).json({ message: 'Invalid or expired token' });
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