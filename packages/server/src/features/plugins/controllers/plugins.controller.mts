import { Request, Response } from 'express';
import { logger } from '../../../utils/logger.mjs';
import { pluginRegistry } from '../../../services/plugin-registry.service.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';

export class PluginsController {
  /**
   * Get all available plugins
   */
  async getPlugins(_req: Request, res: Response): Promise<Response> {
    try {
      logger.info('Fetching all plugins');
      
      const plugins = pluginRegistry.getAllPlugins();
      
      // Transform plugins to match expected API format
      const apiPlugins = plugins.map(plugin => ({
        config: {
          id: plugin.id,
          name: plugin.name,
          type: 'gameSystem', // All our plugins are game systems for now
          enabled: true,
          description: plugin.name,
          version: '1.0.0',
          author: 'Dungeon Lab Team'
        },
        metadata: {
          loadTime: Date.now(),
          status: 'active',
          lastError: null
        }
      }));
      
      const response: BaseAPIResponse<typeof apiPlugins> = {
        success: true,
        data: apiPlugins,
        error: undefined
      };
      
      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching plugins:', error);
      
      const response: BaseAPIResponse<null> = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      
      return res.status(500).json(response);
    }
  }
  
  /**
   * Get a specific plugin by ID
   */
  async getPlugin(req: Request, res: Response): Promise<Response> {
    try {
      const { pluginId } = req.params;
      
      if (!pluginId) {
        const response: BaseAPIResponse<null> = {
          success: false,
          data: null,
          error: 'Plugin ID is required'
        };
        return res.status(400).json(response);
      }
      
      logger.info(`Fetching plugin: ${pluginId}`);
      
      const plugin = pluginRegistry.getPlugin(pluginId);
      
      if (!plugin) {
        const response: BaseAPIResponse<null> = {
          success: false,
          data: null,
          error: `Plugin '${pluginId}' not found`
        };
        return res.status(404).json(response);
      }
      
      // Transform plugin to match expected API format
      const apiPlugin = {
        config: {
          id: plugin.id,
          name: plugin.name,
          type: 'gameSystem',
          enabled: true,
          description: plugin.name,
          version: '1.0.0',
          author: 'Dungeon Lab Team'
        },
        metadata: {
          loadTime: Date.now(),
          status: 'active',
          lastError: null
        }
      };
      
      const response: BaseAPIResponse<typeof apiPlugin> = {
        success: true,
        data: apiPlugin,
        error: undefined
      };
      
      return res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching plugin:', error);
      
      const response: BaseAPIResponse<null> = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      
      return res.status(500).json(response);
    }
  }
}