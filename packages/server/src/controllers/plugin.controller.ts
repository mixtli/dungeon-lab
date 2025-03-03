import { Request, Response } from 'express';
import { PluginModel, PluginDocument } from '../models/plugin.model.js';
import { GameSystemModel } from '../models/game-system.model.js';
import { logger } from '../utils/logger.js';
import { pluginRegistry } from '../services/plugin-registry.service.js';
import { Plugin } from '@dungeon-lab/shared';

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
export class PluginController {
  /**
   * Get all plugins
   */
  async getAllPlugins(req: Request, res: Response): Promise<void> {
    try {
      // Get plugins from the registry instead of the database
      const plugins = pluginRegistry.getAllPlugins();
      res.json(plugins);
    } catch (error) {
      logger.error('Error getting plugins:', error);
      res.status(500).json({ 
        message: 'Error retrieving plugins',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get a single plugin by ID
   */
  async getPlugin(req: Request, res: Response): Promise<void> {
    try {
      const plugin = pluginRegistry.getPlugin(req.params.id);
      
      if (!plugin) {
        res.status(404).json({ message: 'Plugin not found' });
        return;
      }
      
      res.json(plugin);
    } catch (error) {
      logger.error(`Error getting plugin ${req.params.id}:`, error);
      res.status(500).json({ 
        message: 'Error retrieving plugin',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // The following methods are deprecated and will be removed once the file-based config is fully implemented
  
  /**
   * Register a new plugin
   * @deprecated Use file-based configuration instead
   */
  async registerPlugin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.status(400).json({ message: 'Manual plugin registration is deprecated. Please use file-based configuration instead.' });
    } catch (error) {
      logger.error('Error with plugin action:', error);
      res.status(500).json({ 
        message: 'Error with plugin action',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Update a plugin
   * @deprecated Use file-based configuration instead
   */
  async updatePlugin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.status(400).json({ message: 'Manual plugin updates are deprecated. Please use file-based configuration instead.' });
    } catch (error) {
      logger.error(`Error with plugin action:`, error);
      res.status(500).json({ 
        message: 'Error with plugin action',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Enable a plugin
   * @deprecated Use file-based configuration instead
   */
  async enablePlugin(req: Request, res: Response): Promise<void> {
    try {
      res.status(400).json({ message: 'Manual plugin enabling is deprecated. Please use file-based configuration instead.' });
    } catch (error) {
      logger.error(`Error with plugin action:`, error);
      res.status(500).json({ 
        message: 'Error with plugin action',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Disable a plugin
   * @deprecated Use file-based configuration instead
   */
  async disablePlugin(req: Request, res: Response): Promise<void> {
    try {
      res.status(400).json({ message: 'Manual plugin disabling is deprecated. Please use file-based configuration instead.' });
    } catch (error) {
      logger.error(`Error with plugin action:`, error);
      res.status(500).json({ 
        message: 'Error with plugin action',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Unregister (delete) plugin
   * @deprecated Use file-based configuration instead
   */
  async unregisterPlugin(req: Request, res: Response): Promise<void> {
    try {
      res.status(400).json({ message: 'Manual plugin unregistration is deprecated. Please use file-based configuration instead.' });
    } catch (error) {
      logger.error(`Error with plugin action:`, error);
      res.status(500).json({ 
        message: 'Error with plugin action',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
} 