import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';

/**
 * Plugin controller class for managing plugin operations
 */
export class PluginController {
  /**
   * Get all plugins
   */
  async getAllPlugins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plugins = pluginRegistry.getAllPlugins();
      res.json(plugins);
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Get a single plugin by ID
   */
  async getPlugin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plugin = pluginRegistry.getPlugin(req.params.id);
      
      if (!plugin) {
        res.status(404).json({ message: 'Plugin not found' });
        return;
      }
      
      res.json(plugin);
    } catch (error) {
      next(error);
    }
  }
} 