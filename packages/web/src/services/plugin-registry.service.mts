import { IPlugin, IPluginRegistry, IGameSystemPlugin } from '@dungeon-lab/shared/index.mjs';

/**
 * Client-side Plugin Registry Service
 * This service manages the client-side plugin registry
 */
export class PluginRegistryService implements IPluginRegistry {
  private plugins: Map<string, IPlugin> = new Map();
  private gameSystemPlugins: Map<string, IGameSystemPlugin> = new Map();
  private loadedComponents: Map<string, any> = new Map();
  
  /**
   * Initialize the plugin registry
   */
  async initialize(): Promise<void> {
    console.info('Initializing client-side plugin registry...');
    
    try {
      // Fetch all plugins from the server
      const response = await fetch('/api/plugins');
      if (!response.ok) {
        throw new Error(`Error fetching plugins: ${response.statusText}`);
      }
      
      const pluginsData = await response.json();
      
      // Process each plugin
      for (const pluginData of pluginsData) {
        this.registerPlugin(pluginData);
      }
      
      // Initialize all enabled plugins
      await this.initializeEnabledPlugins();
      
      console.info(`Loaded ${this.plugins.size} plugins (${this.gameSystemPlugins.size} game systems)`);
    } catch (error) {
      console.error('Error initializing plugin registry:', error);
      throw error;
    }
  }
  
  /**
   * Register a plugin in the registry
   * @param pluginData The plugin data
   */
  private registerPlugin(pluginData: any): void {
    try {
      // Create the plugin object
      const plugin: IPlugin = {
        config: {
          id: pluginData.config.id,
          name: pluginData.config.name,
          version: pluginData.config.version,
          description: pluginData.config.description,
          author: pluginData.config.author,
          website: pluginData.config.website,
          type: pluginData.config.type,
          enabled: pluginData.config.enabled,
          clientEntryPoint: pluginData.config.clientEntryPoint
        },
        onLoad: async () => {}, // Empty implementation for client-side
        onUnload: async () => {}, // Empty implementation for client-side
        onRegister: async () => {} // Empty implementation for client-side
      };
      
      // Store the plugin
      this.plugins.set(plugin.config.id, plugin);
      
      // If this is a game system plugin, store it in the game system plugins map
      if (pluginData.type === 'gameSystem') {
        const gameSystemPlugin = {
          ...plugin,
          type: 'gameSystem' as const,
          gameSystem: pluginData.gameSystem,
          getActorSheet: (actorType: string) => {
            const actorTypes = pluginData.gameSystem.actorTypes || [];
            const actorTypeConfig = actorTypes.find((t: { name: string; uiComponent?: string }) => t.name === actorType);
            return actorTypeConfig?.uiComponent;
          },
          getItemSheet: (itemType: string) => {
            const itemTypes = pluginData.gameSystem.itemTypes || [];
            const itemTypeConfig = itemTypes.find((t: { name: string; uiComponent?: string }) => t.name === itemType);
            return itemTypeConfig?.uiComponent;
          },
          validateActorData: () => true, // Client-side validation not implemented
          validateItemData: () => true // Client-side validation not implemented
        };
        this.gameSystemPlugins.set(plugin.config.id, gameSystemPlugin);
      }
      
      // If this is a game system plugin with a client entry point, process it
      if (pluginData.type === 'gameSystem' && pluginData.clientEntryPoint) {
        // Store a reference to make it easier to load later
        (plugin as any).clientEntryPoint = pluginData.clientEntryPoint;
      }
    } catch (error) {
      console.error(`Error registering plugin ${pluginData.id}:`, error);
    }
  }
  
  /**
   * Initialize all enabled plugins
   */
  private async initializeEnabledPlugins(): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      if ((plugin as any).clientEntryPoint) {
        await this.loadPlugin(plugin.config.id, (plugin as any).clientEntryPoint);
      }
    }
  }
  
  /**
   * Load a plugin
   * @param pluginId The plugin ID
   * @param clientEntryPoint The plugin's client entry point
   */
  private async loadPlugin(pluginId: string, clientEntryPoint: string): Promise<boolean> {
    try {
      console.info(`Loading plugin ${pluginId} from ${clientEntryPoint}`);
      
      // Import the plugin module
      const pluginModule = await import(/* @vite-ignore */ clientEntryPoint);
      
      // Get the default export as the game system plugin
      const gameSystemPlugin = pluginModule.default as IGameSystemPlugin;
      
      if (!gameSystemPlugin) {
        console.warn(`Plugin ${pluginId} does not export a default game system plugin`);
        return false;
      }
      
      // Store the game system plugin
      this.gameSystemPlugins.set(pluginId, gameSystemPlugin);
      
      // Register components if they exist
      if ('components' in pluginModule) {
        for (const [name, component] of Object.entries(pluginModule.components)) {
          this.registerComponent(name, component);
        }
      }
      
      // Initialize the plugin
      await gameSystemPlugin.onLoad();
      
      return true;
    } catch (error) {
      console.error(`Error loading plugin ${pluginId}:`, error);
      return false;
    }
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
  getGameSystemPlugin(pluginId: string): IGameSystemPlugin | undefined {
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
    return Array.from(this.gameSystemPlugins.values());
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
  
  /**
   * Get a component for an item type from a game system
   * @param gameSystemId The game system ID
   * @param itemType The item type
   * @returns The component, or undefined if not found
   */
  getItemComponent(gameSystemId: string, itemType: string): any {
    const gameSystem = this.getGameSystemPlugin(gameSystemId);
    if (!gameSystem) return undefined;
    
    const componentName = gameSystem.getItemSheet(itemType);
    if (!componentName) return undefined;
    
    return this.getComponent(componentName);
  }
}

// Export a singleton instance of the PluginRegistryService
export const pluginRegistry = new PluginRegistryService(); 