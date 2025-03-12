import { IGameSystemPluginServer, PluginActionResult } from '@dungeon-lab/shared/types/plugin.mjs';
import { IPluginActionMessage } from '@dungeon-lab/shared/schemas/websocket-messages.schema.mjs';
import { logger } from '../utils/logger.mjs';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// Path to the plugins directory (relative to the server package)
const PLUGINS_DIR = join(__dirname, '../../../plugins');

// Directories to ignore when scanning for plugins
const IGNORED_DIRS = ['node_modules'];

export interface IPluginRegistry {
  initialize(): Promise<void>;
  getPlugin(pluginId: string): IGameSystemPluginServer | undefined;
  getPlugins(): IGameSystemPluginServer[];
  getGameSystemPlugin(pluginId: string): IGameSystemPluginServer | undefined;
  handlePluginAction(message: IPluginActionMessage): Promise<PluginActionResult | void>;
  cleanupAll(): Promise<void>;
}

class PluginRegistryService implements IPluginRegistry {
  private plugins: Map<string, IGameSystemPluginServer> = new Map();

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing plugin registry...');
      logger.info('Loading plugins from:', PLUGINS_DIR);

      // Read all entries in the plugins directory
      const entries = await readdir(PLUGINS_DIR);
      
      // Filter for directories only and ignore specified directories
      const pluginDirs = await Promise.all(
        entries
          .filter(entry => !IGNORED_DIRS.includes(entry))
          .map(async (entry) => {
            const fullPath = join(PLUGINS_DIR, entry);
            const stats = await stat(fullPath);
            return stats.isDirectory() ? entry : null;
          })
      );
      
      const validPluginDirs = pluginDirs.filter((dir): dir is string => dir !== null);
      logger.info('Found plugin directories:', validPluginDirs);

      // Load each plugin
      for (const dir of validPluginDirs) {
        try {
          // Try dist directory first, fall back to src if not found
          const pluginPath = join(PLUGINS_DIR, dir, 'dist/server/index.mjs');
          logger.info('Loading plugin from:', pluginPath);

          const plugin = (await import(pluginPath)).default;
          if (!plugin) {
            logger.warn('No default export found in plugin:', pluginPath);
            continue;
          }

          // Initialize the plugin
          await plugin.onLoad?.();
          await plugin.onRegister?.();
          logger.info('Plugin initialized:', plugin.config.id);

          // Store the plugin
          this.plugins.set(plugin.config.id, plugin);
          logger.info('Plugin registered:', plugin.config.id);
        } catch (error) {
          logger.error('Failed to load plugin:', dir, error);
        }
      }

      logger.info('Plugin registry initialized with plugins:', Array.from(this.plugins.keys()));
    } catch (error) {
      logger.error('Failed to initialize plugin registry:', error);
      throw error;
    }
  }

  getPlugin(pluginId: string): IGameSystemPluginServer | undefined {
    return this.plugins.get(pluginId);
  }

  getPlugins(): IGameSystemPluginServer[] {
    return Array.from(this.plugins.values());
  }

  getGameSystemPlugin(pluginId: string): IGameSystemPluginServer | undefined {
    const plugin = this.getPlugin(pluginId);
    return plugin?.type === 'gameSystem' ? plugin : undefined;
  }

  async handlePluginAction(message: IPluginActionMessage): Promise<PluginActionResult | void> {
    const plugin = this.getPlugin(message.pluginId);
    if (!plugin) {
      logger.error('Plugin not found:', message.pluginId);
      throw new Error('Plugin not found');
    }

    try {
      if (plugin.handleAction) {
        return await plugin.handleAction(message);
      }
    } catch (error) {
      logger.error('Error handling plugin action:', error);
      throw error;
    }
  }

  async cleanupAll(): Promise<void> {
    logger.info('Cleaning up all plugins...');
    for (const [id, plugin] of this.plugins) {
      try {
        await plugin.onUnload?.();
        logger.info('Plugin cleaned up:', id);
      } catch (error) {
        logger.error('Failed to cleanup plugin:', id, error);
      }
    }
    this.plugins.clear();
    logger.info('All plugins cleaned up');
  }
}

export const pluginRegistry = new PluginRegistryService(); 