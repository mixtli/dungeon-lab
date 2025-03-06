import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.mjs';

/**
 * Middleware to log all HTTP requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request details
  logger.info(`[${req.method}] ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log request body if present (and not a file upload)
  if (req.body && Object.keys(req.body).length > 0 && !req.is('multipart/form-data')) {
    logger.debug('Request body:', req.body);
  }

  // Log response details when the response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[logLevel](`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
    });
  });

  next();
}; 