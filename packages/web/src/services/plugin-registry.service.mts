import { IWebPlugin, IGameSystemPluginWeb } from '@dungeon-lab/shared/types/plugin.mjs';
import { createPluginAPI } from '@/services/plugin-api.service.mjs';
import { PluginsClient } from '@dungeon-lab/client/index.mjs';

// Define a type for plugin config
interface PluginConfig {
  config: {
    id: string;
    name: string;
    version: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const pluginsClient = new PluginsClient();

/**
 * Plugin Registry Service
 * Manages a registry of plugins for the web client
 */
export class PluginRegistryService {
  private plugins = new Map<string, IWebPlugin>();
  private gameSystemPlugins = new Map<string, IGameSystemPluginWeb>();
  private loadedPlugins = new Set<string>();
  private loadingPlugins = new Set<string>();
  private initializedPlugins = new Set<string>();
  private initialized = false;

  /**
   * Initialize the plugin registry
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Plugin registry already initialized, skipping');
      return;
    }

    try {
      this.initialized = true;
      await this.loadAvailablePlugins();
      console.log('Plugin registry initialized');
    } catch (error) {
      this.initialized = false;
      console.error('Failed to initialize plugin registry:', error);
      throw error;
    }
  }

  /**
   * Load available plugins from the server
   */
  private async loadAvailablePlugins(): Promise<void> {
    try {
      const availablePlugins = await pluginsClient.getPlugins();

      await Promise.all(
        availablePlugins.map(async (pluginConfig: PluginConfig) => {
          try {
            await this.loadPlugin(pluginConfig.config.id);
          } catch (error) {
            console.error(`Failed to load plugin ${pluginConfig.config.id}:`, error);
          }
        })
      );
    } catch (error) {
      console.error('Failed to load available plugins:', error);
      throw error;
    }
  }

  /**
   * Load a plugin by ID
   */
  public async loadPlugin(pluginId: string): Promise<IWebPlugin | undefined> {
    if (this.loadedPlugins.has(pluginId)) {
      console.log(`Plugin ${pluginId} already loaded`);
      return this.plugins.get(pluginId);
    }

    if (this.loadingPlugins.has(pluginId)) {
      console.log(`Plugin ${pluginId} is already loading`);
      // Wait for it to load
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (this.loadedPlugins.has(pluginId)) {
            clearInterval(interval);
            resolve(this.plugins.get(pluginId));
          }
        }, 100);
      });
    }

    try {
      this.loadingPlugins.add(pluginId);

      const pluginModule = await import(`../../../plugins/${pluginId}/src/web/index.mts`);

      const PluginClass = pluginModule.default;
      if (!PluginClass) {
        throw new Error(`Plugin ${pluginId} has no default export`);
      }

      // Create plugin API for this plugin
      const api = createPluginAPI(pluginId);

      // Initialize plugin with API
      const plugin = new PluginClass(api);
      await this.registerPlugin(plugin);

      this.loadingPlugins.delete(pluginId);
      this.loadedPlugins.add(pluginId);

      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      this.loadingPlugins.delete(pluginId);
      throw error;
    }
  }

  /**
   * Register a plugin with the registry
   */
  private async registerPlugin(plugin: IWebPlugin): Promise<void> {
    this.plugins.set(plugin.config.id, plugin);

    if (plugin.type === 'gameSystem') {
      this.gameSystemPlugins.set(plugin.config.id, plugin as IGameSystemPluginWeb);
    }

    try {
      await plugin.onRegister();
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.config.id}:`, error);
    }
  }

  /**
   * Initialize a plugin by calling its onLoad method
   */
  public async initializePlugin(pluginId: string): Promise<void> {
    if (this.initializedPlugins.has(pluginId)) {
      console.log(`Plugin ${pluginId} already initialized`);
      return;
    }

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`);
      return;
    }

    try {
      await plugin.onLoad();
      this.initializedPlugins.add(pluginId);
    } catch (error) {
      console.error(`Failed to initialize plugin ${pluginId}:`, error);
    }
  }

  /**
   * Get all registered plugins
   */
  public getPlugins(): IWebPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all registered game system plugins
   */
  public getGameSystemPlugins(): IGameSystemPluginWeb[] {
    return Array.from(this.gameSystemPlugins.values());
  }

  /**
   * Get a plugin by ID
   */
  public getPlugin(pluginId: string): IWebPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get a game system plugin by ID
   */
  public getGameSystemPlugin(pluginId: string): IGameSystemPluginWeb | undefined {
    return this.gameSystemPlugins.get(pluginId);
  }

  /**
   * Load a game system plugin by ID
   */
  public async loadGameSystemPlugin(pluginId: string): Promise<IGameSystemPluginWeb | undefined> {
    const plugin = await this.loadPlugin(pluginId);
    return plugin as IGameSystemPluginWeb;
  }

  /**
   * Get plugin code for a specific file
   */
  public async getPluginCode(pluginId: string, fileName: string): Promise<string> {
    return pluginsClient.getPluginCode(pluginId, fileName);
  }
}

// Create a singleton instance
export const pluginRegistry = new PluginRegistryService();
