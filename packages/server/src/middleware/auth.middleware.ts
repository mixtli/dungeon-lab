import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        isAdmin: boolean;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      username: string;
      isAdmin: boolean;
    };
    
    // Attach user to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      isAdmin: decoded.isAdmin,
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
      },
    });
  }
}

/**
 * Middleware to check if user is an admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
      },
    });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Admin privileges required',
      },
    });
  }
  
  next();
} 