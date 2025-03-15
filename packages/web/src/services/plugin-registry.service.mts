import { ref, computed } from 'vue';
import { IWebPlugin, IGameSystemPluginWeb, IPluginUIAssets } from '@dungeon-lab/shared/types/plugin.mjs';

/**
 * Plugin Registry Service
 * Manages a registry of plugins for the web client
 */
export class PluginRegistryService {
  private _plugins = ref<Map<string, IWebPlugin>>(new Map());
  private _gameSystemPlugins = ref<Map<string, IGameSystemPluginWeb>>(new Map());
  private _enabledPlugins = ref<Set<string>>(new Set());
  private _loadedPlugins = ref<Set<string>>(new Set());
  private _loadingPlugins = ref<Set<string>>(new Set());
  private _initializedPlugins = ref<Set<string>>(new Set());
  private _initialized = false;

  /**
   * Get a reactive collection of all registered plugins
   */
  public get plugins() {
    return computed(() => Array.from(this._plugins.value.values()));
  }

  /**
   * Get a reactive collection of all registered game system plugins
   */
  public get gameSystemPlugins() {
    return computed(() => Array.from(this._gameSystemPlugins.value.values()));
  }

  /**
   * Get a reactive collection of all enabled plugins
   */
  public get enabledPlugins() {
    return computed(() => {
      return Array.from(this._plugins.value.values())
        .filter(plugin => this._enabledPlugins.value.has(plugin.config.id));
    });
  }

  /**
   * Initialize the plugin registry
   * This will load available plugins from the server and create instances
   */
  public async initialize(): Promise<void> {
    // Only initialize once
    if (this._initialized) {
      console.log('Plugin registry already initialized, skipping');
      return;
    }
    
    try {
      this._initialized = true;
      await this.loadAvailablePlugins();
      console.log('Plugin registry initialized');
    } catch (error) {
      this._initialized = false;
      console.error('Failed to initialize plugin registry:', error);
    }
  }

  /**
   * Load available plugins from the server
   * This will fetch the list of available plugins and load them
   */
  private async loadAvailablePlugins(): Promise<void> {
    try {
      // Fetch available plugins from the server
      const response = await fetch('/api/plugins');
      const availablePlugins = await response.json();
      
      // Load each plugin
      await Promise.all(availablePlugins.map(async (pluginConfig: any) => {
        try {
          await this.loadPlugin(pluginConfig.config.id);
        } catch (error) {
          console.error(`Failed to load plugin ${pluginConfig.id}:`, error);
        }
      }));
    } catch (error) {
      console.error('Failed to load available plugins:', error);
      throw error;
    }
  }

  /**
   * Load a plugin by ID
   * This will dynamically import the plugin module and register it
   * 
   * @param pluginId - The ID of the plugin to load
   * @returns A promise that resolves when the plugin is loaded
   */
  public async loadPlugin(pluginId: string): Promise<IWebPlugin | undefined> {
    if (this._loadedPlugins.value.has(pluginId)) {
      console.log(`Plugin ${pluginId} already loaded`);
      return this._plugins.value.get(pluginId);
    }

    if (this._loadingPlugins.value.has(pluginId)) {
      console.log(`Plugin ${pluginId} is already loading`);
      // Wait for it to load
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (this._loadedPlugins.value.has(pluginId)) {
            clearInterval(interval);
            resolve(this._plugins.value.get(pluginId));
          }
        }, 100);
      });
    }

    try {
      // Mark the plugin as loading
      this._loadingPlugins.value.add(pluginId);

      // Dynamically import the plugin's client entry point
      // Using the new standardized import path - targeting the index.mjs file in the web directory
      const importPath = `#plugins/${pluginId}/web/index.mts`;
      console.log(`Loading plugin from ${importPath}`);
      
      // Import the plugin module
      const pluginModule = await import(`../../../plugins/${pluginId}/src/web/index.mts`);
      console.log("PLUGIN MODULE", pluginModule)
      
      // If pluginModule is a constructor, instantiate it, otherwise use default export
      const PluginClass = pluginModule.default;
      if (!PluginClass) {
        throw new Error(`Plugin ${pluginId} has no default export`);
      }
      
      // Create an instance of the plugin
      const plugin = new PluginClass();
      
      // Register the plugin
      this.registerPlugin(plugin);
      
      // Mark the plugin as loaded
      this._loadingPlugins.value.delete(pluginId);
      this._loadedPlugins.value.add(pluginId);
      
      return plugin;
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      this._loadingPlugins.value.delete(pluginId);
      throw error;
    }
  }

  /**
   * Register a plugin with the registry
   * 
   * @param plugin - The plugin to register
   * @returns A promise that resolves when the plugin is registered
   */
  public async registerPlugin(plugin: IWebPlugin): Promise<void> {
    // Add the plugin to the registry
    this._plugins.value.set(plugin.config.id, plugin);
    
    // If it's a game system plugin, add it to the game system registry
    if ('gameSystem' in plugin) {
      this._gameSystemPlugins.value.set(plugin.config.id, plugin as IGameSystemPluginWeb);
    }
    
    // If the plugin is enabled, add it to the enabled set
    if (plugin.config.enabled) {
      this._enabledPlugins.value.add(plugin.config.id);
    }
    
    // Call the plugin's onRegister method
    try {
      await plugin.onRegister();
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.config.id}:`, error);
    }
  }

  /**
   * Initialize a plugin by calling its onLoad method
   * 
   * @param pluginId - The ID of the plugin to initialize
   * @returns A promise that resolves when the plugin is initialized
   */
  public async initializePlugin(pluginId: string): Promise<void> {
    if (this._initializedPlugins.value.has(pluginId)) {
      console.log(`Plugin ${pluginId} already initialized`);
      return;
    }
    
    const plugin = this._plugins.value.get(pluginId);
    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`);
      return;
    }
    
    try {
      // Call the plugin's onLoad method
      await plugin.onLoad();
      
      // Mark the plugin as initialized
      this._initializedPlugins.value.add(pluginId);
    } catch (error) {
      console.error(`Failed to initialize plugin ${pluginId}:`, error);
    }
  }

  /**
   * Enable a plugin
   * 
   * @param pluginId - The ID of the plugin to enable
   */
  public enablePlugin(pluginId: string): void {
    const plugin = this._plugins.value.get(pluginId);
    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`);
      return;
    }
    
    // Update the plugin's config
    plugin.config.enabled = true;
    
    // Add to enabled set
    this._enabledPlugins.value.add(pluginId);
    
    // Initialize the plugin if not already initialized
    if (!this._initializedPlugins.value.has(pluginId)) {
      this.initializePlugin(pluginId).catch(error => {
        console.error(`Failed to initialize plugin ${pluginId}:`, error);
      });
    }
  }

  /**
   * Disable a plugin
   * 
   * @param pluginId - The ID of the plugin to disable
   */
  public disablePlugin(pluginId: string): void {
    const plugin = this._plugins.value.get(pluginId);
    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`);
      return;
    }
    
    // Update the plugin's config
    plugin.config.enabled = false;
    
    // Remove from enabled set
    this._enabledPlugins.value.delete(pluginId);
  }

  /**
   * Get a plugin by ID
   * 
   * @param pluginId - The ID of the plugin to get
   * @returns The plugin, or undefined if not found
   */
  public getPlugin(pluginId: string): IWebPlugin | undefined {
    return this._plugins.value.get(pluginId);
  }

  /**
   * Get a game system plugin by ID
   * 
   * @param pluginId - The ID of the plugin to get
   * @returns The game system plugin, or undefined if not found
   */
  public getGameSystemPlugin(pluginId: string): IGameSystemPluginWeb | undefined {
    return this._gameSystemPlugins.value.get(pluginId);
  }

  /**
   * Get UI assets for a context from a plugin
   * 
   * @param pluginId - The ID of the plugin to get assets from
   * @param context - The UI context to get assets for
   * @returns The UI assets for the context, or undefined if not found
   */
  public async getPluginUIAssets(
    pluginId: string, 
    context: string
  ): Promise<IPluginUIAssets | undefined> {
    const plugin = this._plugins.value.get(pluginId);
    if (!plugin) {
      console.error(`Plugin ${pluginId} not found`);
      return undefined;
    }
    
    // Return the assets directly from the plugin if available
    const assets = plugin.getUIAssets(context);
    if (!assets) {
      console.warn(`Plugin ${pluginId} has no UI assets for context: ${context}`);
    }
    
    return assets;
  }
}

// Create a singleton instance
export const pluginRegistry = new PluginRegistryService();