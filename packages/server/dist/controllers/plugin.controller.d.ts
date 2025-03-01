import { Request, Response } from 'express';
/**
 * Interface extending the Express Request with a custom user property
 */
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
        isAdmin: boolean;
    };
}
/**
 * Plugin controller class
 */
export declare class PluginController {
    /**
     * Get all plugins
     */
    getAllPlugins(req: Request, res: Response): Promise<void>;
    /**
     * Get plugin by ID
     */
    getPlugin(req: Request, res: Response): Promise<void>;
    /**
     * Register a new plugin
     */
    registerPlugin(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Update plugin
     */
    updatePlugin(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Enable plugin
     */
    enablePlugin(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Disable plugin
     */
    disablePlugin(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Unregister (delete) plugin
     */
    unregisterPlugin(req: Request, res: Response): Promise<void>;
}
export {};
