import { IPlugin, IPluginRegistry, IGameSystemPlugin, IGameSystemPluginWeb } from '@dungeon-lab/shared/index.mjs';
import { IWebPlugin, IPluginUIAssets } from '@dungeon-lab/shared/types/plugin.mjs';
import { loadPluginUIAssets } from './plugin-asset-loader.service.mjs';

/**
 * Client-side Plugin Registry Service
 * This service manages the client-side plugin registry
 */
export class PluginRegistryService implements IPluginRegistry {
  private plugins: Map<string, IPlugin> = new Map();
  private gameSystemPlugins: Map<string, IGameSystemPluginWeb> = new Map();
  private loadedComponents: Map<string, any> = new Map();
  
  constructor() {
    // Register the plugins directly
  }
  
  /**
   * Initialize the plugin registry
   */
  async initialize(): Promise<void> {
    console.info('Initializing client-side plugin registry...');
    
    try {
      // Initialize all enabled plugins
      await this.initializeEnabledPlugins();
      
      // Load essential UI assets for enabled plugins
      await this.loadEssentialUIAssets();
      
      console.info(`Loaded ${this.plugins.size} plugins (${this.gameSystemPlugins.size} game systems)`);
    } catch (error) {
      console.error('Error initializing plugin registry:', error);
      throw error;
    }
  }
  
  /**
   * Register a plugin directly
   * @param plugin The plugin instance
   */
  public registerPlugin(plugin: IPlugin): void {
    try {
      // Store the plugin
      this.plugins.set(plugin.config.id, plugin);
      
      // If it's a game system plugin, store it in the game system plugins map
      if (plugin.config.type === 'gameSystem') {
        this.gameSystemPlugins.set(plugin.config.id, plugin as IGameSystemPluginWeb);
      }
      
      console.log(`Registered plugin: ${plugin.config.id} (${plugin.config.name})`);
    } catch (error) {
      console.error(`Error registering plugin ${plugin.config.id}:`, error);
    }
  }
  
  /**
   * Initialize all enabled plugins
   */
  private async initializeEnabledPlugins(): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();
    console.log('Enabled plugins:', enabledPlugins.map(p => p.config.id));
    
    for (const plugin of enabledPlugins) {
      try {
        // Call onLoad if present
        await plugin.onLoad();
        console.log(`Initialized plugin: ${plugin.config.id}`);
      } catch (error) {
        console.error(`Error initializing plugin ${plugin.config.id}:`, error);
      }
    }
  }
  
  /**
   * Load essential UI assets for all enabled plugins
   * This pre-loads assets that are likely to be needed immediately
   */
  private async loadEssentialUIAssets(): Promise<void> {
    const enabledWebPlugins = this.getEnabledPlugins()
      .filter(plugin => 'getUIAssetPaths' in plugin) as IWebPlugin[];
    
    // Define essential contexts that should be pre-loaded
    const essentialContexts = ['characterSheet', 'characterCreation'];
    
    for (const plugin of enabledWebPlugins) {
      for (const context of essentialContexts) {
        // Check if the plugin has assets for this context
        if (plugin.getUIAssetPaths(context)) {
          try {
            console.log(`Pre-loading essential UI assets for ${plugin.config.id}, context: ${context}`);
            await loadPluginUIAssets(plugin, context);
          } catch (error) {
            console.warn(`Failed to pre-load UI assets for ${plugin.config.id}, context: ${context}`, error);
            // Non-critical error, continue with other assets
          }
        }
      }
    }
  }
  
  /**
   * Get UI assets for a plugin context, loading them if necessary
   * @param pluginId The plugin ID
   * @param context The UI context
   * @returns The UI assets, or undefined if not available
   */
  async getPluginUIAssets(pluginId: string, context: string): Promise<IPluginUIAssets | undefined> {
    const plugin = this.getPlugin(pluginId) as IWebPlugin | undefined;
    if (!plugin || !('getUIAssets' in plugin)) {
      return undefined;
    }
    
    // Check if assets are already loaded
    let assets = plugin.getUIAssets(context);
    if (!assets) {
      // Try to load them
      const success = await loadPluginUIAssets(plugin, context);
      if (success) {
        assets = plugin.getUIAssets(context);
      }
    }
    
    return assets;
  }
  
  /**
   * Register a component
   * @param name The component name
   * @param component The component
   */
  registerComponent(name: string, component: any): void {
    this.loadedComponents.set(name, component);
  }
  
  /**
   * Get a component by name
   * @param name The component name
   * @returns The component, or undefined if not found
   */
  getComponent(name: string): any {
    return this.loadedComponents.get(name);
  }
  
  /**
   * Get a plugin by ID
   * @param pluginId The plugin ID
   * @returns The plugin, or undefined if not found
   */
  getPlugin(pluginId: string): IPlugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * Get a game system plugin by ID
   * @param pluginId The plugin ID
   * @returns The game system plugin, or undefined if not found
   */
  getGameSystemPlugin(pluginId: string): IGameSystemPluginWeb | undefined {
    return this.gameSystemPlugins.get(pluginId);
  }
  
  /**
   * Get all plugins
   * @returns Array of all plugins
   */
  getAllPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get all game system plugins
   * @returns Array of all game system plugins
   */
  getAllGameSystemPlugins(): IGameSystemPlugin[] {
    return Array.from(this.gameSystemPlugins.values()) as IGameSystemPlugin[];
  }
  
  /**
   * Get all enabled plugins
   * @returns Array of all enabled plugins
   */
  getEnabledPlugins(): IPlugin[] {
    return this.getAllPlugins().filter(plugin => plugin.config.enabled);
  }
  
  /**
   * Get a component for an actor type from a game system
   * @param gameSystemId The game system ID
   * @param actorType The actor type
   * @returns The component, or undefined if not found
   */
  getActorComponent(gameSystemId: string, actorType: string): any {
    const gameSystem = this.getGameSystemPlugin(gameSystemId);
    if (!gameSystem) return undefined;
    
    const componentName = gameSystem.getActorSheet(actorType);
    if (!componentName) return undefined;
    
    return this.getComponent(componentName);
  }
}

// Export a singleton instance of the plugin registry
export const pluginRegistry = new PluginRegistryService();