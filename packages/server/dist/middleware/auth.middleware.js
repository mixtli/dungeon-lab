"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
/**
 * Middleware to authenticate JWT tokens
 */
function authenticate(req, res, next) {
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
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        // Attach user to request
        req.user = {
            id: decoded.id,
            username: decoded.username,
            isAdmin: decoded.isAdmin,
        };
        next();
    }
    catch (error) {
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
function requireAdmin(req, res, next) {
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
//# sourceMappingURL=auth.middleware.js.map