import type { 
  GameSystemPlugin, 
  PluginContext,
  PluginManifest
} from '@dungeon-lab/shared/types/plugin.mjs';
import type { ComponentRegistry, ComponentMetadata } from '@dungeon-lab/shared/types/component-registry.mjs';
import type { Component } from 'vue';
import { MechanicsRegistryImpl } from './plugin-implementations/mechanics-registry-impl.mjs';
import { PluginContextImpl } from './plugin-implementations/plugin-context-impl.mjs';
import { pluginDiscoveryService } from './plugin-discovery.service.mjs';

/**
 * Component registry implementation
 */
class ComponentRegistryImpl implements ComponentRegistry {
  private components = new Map<string, { component: Component; metadata: ComponentMetadata }>();
  
  register(id: string, component: Component, metadata?: ComponentMetadata): void {
    if (this.components.has(id)) {
      console.warn(`Component with id '${id}' already exists, overwriting`);
    }
    
    const meta: ComponentMetadata = metadata || {
      pluginId: 'unknown',
      name: id
    };
    
    this.components.set(id, { component, metadata: meta });
    console.log(`[ComponentRegistry] Registered component '${id}' for plugin '${meta.pluginId}'`);
  }
  
  get(id: string): Component | undefined {
    const entry = this.components.get(id);
    return entry?.component;
  }
  
  getByPlugin(pluginId: string) {
    const entries = [];
    for (const [id, { component, metadata }] of this.components.entries()) {
      if (metadata.pluginId === pluginId) {
        entries.push({ id, component, metadata });
      }
    }
    return entries;
  }
  
  unregister(id: string): void {
    const entry = this.components.get(id);
    if (entry) {
      this.components.delete(id);
      console.log(`[ComponentRegistry] Unregistered component '${id}' from plugin '${entry.metadata.pluginId}'`);
    }
  }
  
  unregisterByPlugin(pluginId: string): void {
    const componentsToRemove: string[] = [];
    
    for (const [id, { metadata }] of this.components.entries()) {
      if (metadata.pluginId === pluginId) {
        componentsToRemove.push(id);
      }
    }
    
    for (const id of componentsToRemove) {
      this.components.delete(id);
    }
    
    console.log(`[ComponentRegistry] Unregistered ${componentsToRemove.length} components for plugin '${pluginId}'`);
  }
  
  list() {
    const entries = [];
    for (const [id, { component, metadata }] of this.components.entries()) {
      entries.push({ id, component, metadata });
    }
    return entries;
  }
}

/**
 * New manifest-based plugin registry service
 */
export class PluginRegistryService {
  private loadedPlugins: Map<string, GameSystemPlugin> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();
  private initialized = false;
  private componentRegistry = new ComponentRegistryImpl();
  private mechanicsRegistry = new MechanicsRegistryImpl();
  
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
      
      // Discover available plugins via manifests
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
      
      console.log(`[PluginRegistry] ✅ Successfully loaded and initialized: ${plugin.name}`);
      return plugin;
      
    } catch (error) {
      console.error(`[PluginRegistry] ❌ Failed to load plugin ${pluginId}:`, error);
      return null;
    }
  }
  
  /**
   * Initialize a plugin with context and register its components
   */
  private async initializePlugin(plugin: GameSystemPlugin): Promise<void> {
    try {
      console.log(`[PluginRegistry] 🚀 Initializing plugin: ${plugin.name}`);
      
      // Create plugin context
      const context = this.createPluginContext(plugin);
      this.pluginContexts.set(plugin.id, context);
      
      // Call plugin onLoad
      await plugin.onLoad(context);
      
      // Register components
      console.log(`[PluginRegistry] 📋 Registering components for ${plugin.name}`);
      plugin.registerComponents(this.componentRegistry);
      console.log(`[PluginRegistry] Registered components, total: ${this.componentRegistry.list().length}`);
      
      // Register mechanics
      console.log(`[PluginRegistry] ⚙️ Registering mechanics for ${plugin.name}`);
      plugin.registerMechanics(this.mechanicsRegistry);
      console.log(`[PluginRegistry] Registered mechanics, total: ${this.mechanicsRegistry.list().length}`);
      
      console.log(`[PluginRegistry] ✅ Plugin ${plugin.name} fully initialized`);
      
    } catch (error) {
      console.error(`[PluginRegistry] ❌ Failed to initialize plugin ${plugin.name}:`, error);
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
    
    const componentId = `${gameSystemId}-${componentType}`;
    const component = this.componentRegistry.get(componentId);
    
    if (component) {
      console.log(`[PluginRegistry] ✅ Found component: ${componentId}`);
    } else {
      console.log(`[PluginRegistry] ❌ Component not found: ${componentId}`);
      console.log(`[PluginRegistry] Available components:`, this.componentRegistry.list().map(c => c.id));
    }
    
    return component || null;
  }
  
  /**
   * Get component by direct ID
   */
  getComponentById(componentId: string): Component | null {
    return this.componentRegistry.get(componentId) || null;
  }
  
  /**
   * Get all components for a game system
   */
  getComponentsForGameSystem(gameSystemId: string): Array<{ id: string; component: Component; metadata: ComponentMetadata }> {
    return this.componentRegistry.getByPlugin(gameSystemId);
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
      
      // Clear registrations
      this.componentRegistry.unregisterByPlugin(pluginId);
      this.mechanicsRegistry.unregisterByPlugin(pluginId);
      
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
        console.log(`[Plugin ${plugin.id}] Socket emit:`, event, args);
        const lastArg = args[args.length - 1];
        if (typeof lastArg === 'function') {
          lastArg({ success: true });
        }
      },
      on: (event: string) => {
        console.log(`[Plugin ${plugin.id}] Socket on:`, event);
      },
      off: (event: string) => {
        console.log(`[Plugin ${plugin.id}] Socket off:`, event);
      }
    };
    
    return new PluginContextImpl(mockSocket, plugin.id);
  }
}

/**
 * Create singleton plugin registry
 */
export const pluginRegistry = new PluginRegistryService();

/**
 * Export individual registry implementations for advanced use cases
 */
export const componentRegistry = new ComponentRegistryImpl();
export const mechanicsRegistry = new MechanicsRegistryImpl();