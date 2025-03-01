import { Request, Response, NextFunction } from 'express';
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
export declare function authenticate(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Middleware to check if user is an admin
 */
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
