import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.mjs';
import { ZodError } from 'zod';

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

  // Handle ZodError (validation errors)
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: 'Validation error',
      details: err.errors,
      message: err.message,
    });
  }

  // Determine status code (default to 500)
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Send appropriate response
  res.status(statusCode).json({
    success: false,
    error: err.message,
    // Only include stack trace in development
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}; 