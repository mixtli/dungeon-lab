import type { 
  GameSystemPlugin
} from '@dungeon-lab/shared/types/plugin.mjs';
import type { 
  PluginContext
} from '@dungeon-lab/shared/types/plugin-context.mjs';
import type { 
  PluginManifest
} from '@dungeon-lab/shared/types/plugin.mjs';
import type { Component } from 'vue';
import { PluginContextImpl } from './plugin-implementations/plugin-context-impl.mjs';
import { pluginDiscoveryService } from './plugin-discovery.service.mjs';


/**
 * New manifest-based plugin registry service
 */
export class PluginRegistryService {
  private loadedPlugins: Map<string, GameSystemPlugin> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();
  private initialized = false;
  
  /**
   * Initialize the plugin registry with manifest-based discovery
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[PluginRegistry] Already initialized');
      return;
    }
    
    try {
      console.log('[PluginRegistry] 🔍 Starting manifest-based plugin discovery...');
      
      // Discover available plugins using discovery service
      await pluginDiscoveryService.discoverPlugins();
      
      // Load all discovered plugins
      const pluginIds = pluginDiscoveryService.getAvailablePluginIds();
      console.log(`[PluginRegistry] Found ${pluginIds.length} plugins to load:`, pluginIds);
      
      for (const pluginId of pluginIds) {
        await this.loadPlugin(pluginId);
      }
      
      this.initialized = true;
      console.log(`[PluginRegistry] ✅ Initialization complete - ${this.loadedPlugins.size} plugins loaded`);
      
    } catch (error) {
      console.error('[PluginRegistry] ❌ Failed to initialize:', error);
      throw error;
    }
  }
  
  /**
   * Load a specific plugin by ID
   */
  async loadPlugin(pluginId: string): Promise<GameSystemPlugin | null> {
    try {
      console.log(`[PluginRegistry] 📦 Loading plugin: ${pluginId}`);
      
      // Check if already loaded
      if (this.loadedPlugins.has(pluginId)) {
        console.log(`[PluginRegistry] Plugin ${pluginId} already loaded`);
        return this.loadedPlugins.get(pluginId)!;
      }
      
      // Load the plugin module via discovery service
      const plugin = await pluginDiscoveryService.loadPluginModule(pluginId);
      if (!plugin) {
        console.error(`[PluginRegistry] Failed to load plugin module: ${pluginId}`);
        return null;
      }
      
      // Initialize the plugin
      await this.initializePlugin(plugin);
      
      // Store the loaded plugin
      this.loadedPlugins.set(pluginId, plugin);
      
      console.log(`[PluginRegistry] ✅ Successfully loaded and initialized: ${plugin.manifest.name}`);
      return plugin;
      
    } catch (error) {
      console.error(`[PluginRegistry] ❌ Failed to load plugin ${pluginId}:`, error);
      return null;
    }
  }
  
  /**
   * Initialize a plugin with context
   */
  private async initializePlugin(plugin: GameSystemPlugin): Promise<void> {
    try {
      console.log(`[PluginRegistry] 🚀 Initializing plugin: ${plugin.manifest.name}`);
      
      // Create plugin context
      const context = this.createPluginContext(plugin);
      this.pluginContexts.set(plugin.manifest.id, context);
      
      // Call plugin onLoad with context
      await plugin.onLoad(context);
      
      console.log(`[PluginRegistry] ✅ Plugin ${plugin.manifest.name} fully initialized`);
      
    } catch (error) {
      console.error(`[PluginRegistry] ❌ Failed to initialize plugin ${plugin.manifest.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all loaded plugins
   */
  getPlugins(): GameSystemPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }
  
  /**
   * Get a specific plugin by ID
   */
  getGameSystemPlugin(id: string): GameSystemPlugin | null {
    return this.loadedPlugins.get(id) || null;
  }
  
  /**
   * Get a component by game system and component type
   */
  async getComponent(gameSystemId: string, componentType: string): Promise<Component | null> {
    console.log(`[PluginRegistry] 🔍 Getting component: ${gameSystemId}-${componentType}`);
    
    // Ensure plugin is loaded
    if (!this.loadedPlugins.has(gameSystemId)) {
      console.log(`[PluginRegistry] Plugin not loaded, attempting to load: ${gameSystemId}`);
      await this.loadPlugin(gameSystemId);
    }
    
    // Get plugin and ask it for the component directly
    const plugin = this.loadedPlugins.get(gameSystemId);
    if (!plugin) {
      console.log(`[PluginRegistry] ❌ Plugin not found: ${gameSystemId}`);
      return null;
    }
    
    const component = await plugin.getComponent(componentType);
    
    if (component) {
      console.log(`[PluginRegistry] ✅ Found component: ${gameSystemId}-${componentType}`);
    } else {
      console.log(`[PluginRegistry] ❌ Component not found: ${gameSystemId}-${componentType}`);
    }
    
    return component;
  }
  
  
  /**
   * Get plugin context by plugin ID
   */
  getPluginContext(pluginId: string): PluginContext | undefined {
    return this.pluginContexts.get(pluginId);
  }
  
  /**
   * Get plugin manifest by plugin ID
   */
  getPluginManifest(pluginId: string): PluginManifest | undefined {
    return pluginDiscoveryService.getPluginManifest(pluginId);
  }
  
  /**
   * Force reload a plugin (for debugging/development)
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    console.log(`[PluginRegistry] 🔄 Reloading plugin: ${pluginId}`);
    
    // Unload existing plugin
    const existingPlugin = this.loadedPlugins.get(pluginId);
    if (existingPlugin) {
      try {
        await existingPlugin.onUnload();
      } catch (error) {
        console.warn(`[PluginRegistry] Error during plugin unload:`, error);
      }
      
      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginId);
      this.pluginContexts.delete(pluginId);
    }
    
    // Reload the plugin
    await this.loadPlugin(pluginId);
  }
  
  /**
   * Create plugin context for a plugin
   */
  private createPluginContext(plugin: GameSystemPlugin): PluginContext {
    // TODO: Get real socket connection from socket store
    // For now, create a mock socket connection
    const mockSocket = {
      emit: (event: string, ...args: unknown[]) => {
        console.log(`[Plugin ${plugin.manifest.id}] Socket emit:`, event, args);
        const lastArg = args[args.length - 1];
        if (typeof lastArg === 'function') {
          lastArg({ success: true });
        }
      },
      on: (event: string) => {
        console.log(`[Plugin ${plugin.manifest.id}] Socket on:`, event);
      },
      off: (event: string) => {
        console.log(`[Plugin ${plugin.manifest.id}] Socket off:`, event);
      }
    };
    
    return new PluginContextImpl(mockSocket, plugin.manifest.id);
  }
}

/**
 * Create singleton plugin registry
 */
export const pluginRegistry = new PluginRegistryService();