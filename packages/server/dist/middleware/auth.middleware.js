import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = (req, res, next) => {
    try {
        // Get token from Authorization header
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
        const decoded = jwt.verify(token, secret);
        // Attach user to request
        req.user = decoded;
        next();
    }
    catch (error) {
        logger.error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin privileges required' });
    }
    next();
};
//# sourceMappingURL=auth.middleware.js.map