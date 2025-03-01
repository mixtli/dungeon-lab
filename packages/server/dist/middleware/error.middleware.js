import { logger } from '../utils/logger.js';
/**
 * Global error handler middleware for the application
 * Logs errors and provides appropriate responses based on environment
 */
export const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error(`Error: ${err.message}`);
    if (err.stack) {
        logger.error(`Stack: ${err.stack}`);
    }
    // Determine status code (default to 500)
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    // Send appropriate response
    res.status(statusCode).json({
        message: err.message,
        // Only include stack trace in development
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
};
//# sourceMappingURL=error.middleware.js.map