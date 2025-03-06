import { Request, Response, NextFunction } from 'express';
import { IUser } from '@dungeon-lab/shared/index.mjs';
import { logger } from '../utils/logger.mjs';

// Extend Express Session type to include user
declare module 'express-session' {
  interface Session {
    user: IUser;
  }
}

// Extend Express Request type to include session user
export interface AuthenticatedRequest extends Request {
  session: {
    user: IUser;
  } & Request['session'];
}

/**
 * Middleware to authenticate requests using session
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response {
  if (!req.session.user) {
    logger.warn('Unauthorized access attempt');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

/**
 * Middleware to check if user is an admin
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response {
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