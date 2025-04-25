import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { GetPluginsResponse, GetPluginResponse } from '@dungeon-lab/shared/types/api/index.mjs';

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
  async getAllPlugins(
    _req: Request,
    res: Response<GetPluginsResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const plugins = pluginRegistry.getPlugins();
      // Map plugins to a safe format for client consumption
      const clientPlugins = plugins.map((plugin) => ({
        config: plugin.config,
        type: plugin.type,
        name: plugin.config.name,
        description: plugin.config.description || ''
      }));
      res.json({
        success: true,
        data: clientPlugins
      });
    } catch (error) {
      logger.error('Error getting plugins:', error);
      if (error instanceof Error) {
        res.status(500).json({
          success: false,
          data: [],
          error: error.message || 'Failed to get plugins'
        });
      } else {
        res.status(500).json({
          success: false,
          data: [],
          error: 'Failed to get plugins'
        });
      }
      next(error);
    }
  }

  /**
   * Get a single plugin by ID
   */
  async getPlugin(
    req: Request,
    res: Response<GetPluginResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const plugin = pluginRegistry.getPlugin(req.params.id);

      if (!plugin) {
        res.status(404).json({
          success: false,
          error: 'Plugin not found'
        });
        return;
      }

      // Map plugin to a safe format for client consumption
      const clientPlugin = {
        config: plugin.config,
        type: plugin.type
      };

      res.json({
        success: true,
        data: clientPlugin
      });
    } catch (error) {
      logger.error('Error getting plugin:', error);
      if (error instanceof Error) {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to get plugin'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get plugin'
        });
      }
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
        res.status(400).json({
          success: false,
          error: 'Invalid file path'
        });
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
        res.status(404).json({
          success: false,
          error: 'Plugin file not found'
        });
      }
    } catch (error) {
      logger.error('Error serving plugin code:', error);
      if (error instanceof Error) {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to get plugin code'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get plugin code'
        });
      }
      next(error);
    }
  }
}
