import { Request, Response, NextFunction } from 'express';
/**
 * Global error handler middleware for the application
 * Logs errors and provides appropriate responses based on environment
 */
export declare const errorHandler: (err: Error, req: Request, res: Response, next: NextFunction) => void;
