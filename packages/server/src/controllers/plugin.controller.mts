import { Request, Response } from 'express';
import { logger } from '../utils/logger.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import {
  GetPluginsResponse,
  GetPluginResponse,
  GetPluginCodeResponse
} from '@dungeon-lab/shared/types/api/index.mjs';

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
  getAllPlugins = async (
    _req: Request,
    res: Response<GetPluginsResponse>
  ): Promise<Response<GetPluginsResponse> | void> => {
    try {
      const plugins = pluginRegistry.getPlugins();
      // Map plugins to a safe format for client consumption
      const clientPlugins = plugins.map((plugin) => ({
        config: plugin.config,
        type: plugin.type,
        name: plugin.config.name,
        description: plugin.config.description || ''
      }));

      return res.json({
        success: true,
        data: clientPlugins
      });
    } catch (error) {
      logger.error('Error getting plugins:', error);
      return res.status(500).json({
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get plugins'
      });
    }
  };

  /**
   * Get a single plugin by ID
   */
  getPlugin = async (
    req: Request<{ id: string }>,
    res: Response<GetPluginResponse>
  ): Promise<Response<GetPluginResponse> | void> => {
    try {
      const plugin = pluginRegistry.getPlugin(req.params.id);

      if (!plugin) {
        return res.status(404).json({
          success: false,
          error: 'Plugin not found'
        });
      }

      // Map plugin to a safe format for client consumption
      const clientPlugin = {
        config: plugin.config,
        type: plugin.type
      };

      return res.json({
        success: true,
        data: clientPlugin
      });
    } catch (error) {
      logger.error('Error getting plugin:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get plugin'
      });
    }
  };

  /**
   * Get plugin code
   */
  getPluginCode = async (
    req: Request<{ id: string; file: string }>,
    res: Response<GetPluginCodeResponse>
  ): Promise<Response<GetPluginCodeResponse> | void> => {
    try {
      const { id, file } = req.params;

      // Validate the file path to prevent directory traversal
      if (file.includes('..') || !file.endsWith('.mjs')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file path'
        });
      }

      // Construct the full path to the plugin file
      const pluginPath = join(PLUGINS_DIR, id, file);

      try {
        // Read the file
        const code = await readFile(pluginPath, 'utf-8');

        // Return the code as data in the response
        return res.json({
          success: true,
          data: code
        });
      } catch (error) {
        logger.error(`Plugin file not found: ${pluginPath}`, error);
        return res.status(404).json({
          success: false,
          error: 'Plugin file not found'
        });
      }
    } catch (error) {
      logger.error('Error serving plugin code:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get plugin code'
      });
    }
  };
}
