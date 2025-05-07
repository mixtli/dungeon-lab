import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.mjs';

/**
 * Global error handler middleware for the application
 * Logs errors and provides appropriate responses based on environment
 */
export const errorHandler = (
  err: Error, 
  _req: Request, 
  res: Response,
  // Express requires this parameter for error handlers, even if unused
  _: NextFunction, 
) => {
  // Log the error
  logger.error(`Error: ${err.message}`);
  if (err.stack) {
    logger.error(`Stack: ${err.stack}`);
  }

  // Note: Validation errors (Zod, Mongoose) are now handled by validationErrorHandler
  // This handler is for all other types of errors

  // Determine status code (default to 500)
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Send appropriate response
  res.status(statusCode).json({
    success: false,
    data: null,
    error: err.message,
    // Only include stack trace in development
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}; 