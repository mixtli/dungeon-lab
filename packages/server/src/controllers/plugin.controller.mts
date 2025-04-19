import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const PLUGINS_DIR = join(__dirname, '../../../plugins');

/**
 * Plugin controller class for managing plugin operations
 */
export class PluginController {
  /**
   * Get all plugins
   */
  async getAllPlugins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plugins = pluginRegistry.getPlugins();
      // Map plugins to a safe format for client consumption
      const clientPlugins = plugins.map(plugin => ({
        config: plugin.config,
        type: plugin.type
      }));
      res.json(clientPlugins);
    } catch (error) {
      logger.error('Error getting plugins:', error);
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

      // Map plugin to a safe format for client consumption
      const clientPlugin = {
        config: plugin.config,
        type: plugin.type
      };
      
      res.json(clientPlugin);
    } catch (error) {
      logger.error('Error getting plugin:', error);
      next(error);
    }
  }

  /**
   * Get plugin code
   */
  async getPluginCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, file } = req.params;
      
      // Validate the file path to prevent directory traversal
      if (file.includes('..') || !file.endsWith('.mjs')) {
        res.status(400).json({ message: 'Invalid file path' });
        return;
      }

      // Construct the full path to the plugin file
      const pluginPath = join(PLUGINS_DIR, id, file);
      
      try {
        // Read the file
        const code = await readFile(pluginPath, 'utf-8');
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/javascript');
        res.send(code);
      } catch (error) {
        logger.error(`Plugin file not found: ${pluginPath}`, error);
        res.status(404).json({ message: 'Plugin file not found' });
      }
    } catch (error) {
      logger.error('Error serving plugin code:', error);
      next(error);
    }
  }
} 