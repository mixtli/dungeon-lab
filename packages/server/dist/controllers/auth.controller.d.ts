import { Request, Response } from 'express';
/**
 * Register a new user
 */
export declare function register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Login user
 */
export declare function login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
/**
 * Google authentication callback
 */
export declare function googleCallback(req: Request, res: Response): void;
/**
 * Get current user
 */
export declare function getCurrentUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
