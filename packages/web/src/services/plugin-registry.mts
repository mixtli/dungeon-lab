import type { 
  GameSystemPlugin, 
  PluginContext
} from '@dungeon-lab/shared/types/plugin.mjs';
import type { ComponentRegistry, ComponentMetadata } from '@dungeon-lab/shared/types/component-registry.mjs';
import type { Component } from 'vue';
import { MechanicsRegistryImpl } from './plugin-implementations/mechanics-registry-impl.mjs';
import { PluginContextImpl } from './plugin-implementations/plugin-context-impl.mjs';

// Static import for D&D 5e plugin using package dependency
import DnD5ePlugin from '@dungeon-lab/plugin-dnd-5e-2024';

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
 * Main plugin registry service
 */
export class PluginRegistryService {
  private clientPlugins: Map<string, GameSystemPlugin> = new Map();
  private loadedPlugins: Map<string, GameSystemPlugin> = new Map();
  private initialized = false;
  private componentRegistry = new ComponentRegistryImpl();
  private mechanicsRegistry = new MechanicsRegistryImpl();
  
  constructor() {
    // Initialize with real registries
  }
  
  /**
   * Initialize the plugin registry
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Plugin registry already initialized');
      return;
    }
    
    try {
      console.log('Initializing plugin registry...');
      
      // APIs are now handled by the actual server, no need for mocks
      
      // Load plugins from server
      await this.loadPluginsFromServer();
      
      this.initialized = true;
      console.log('Plugin registry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize plugin registry:', error);
      throw error;
    }
  }
  
  /**
   * Initialize plugins method for compatibility
   */
  async initializePlugins(): Promise<void> {
    await this.initialize();
    
    // After loading plugins from server, also try to load the D&D plugin directly
    await this.loadDnD5ePlugin();
  }
  
  /**
   * Get all plugins
   */
  getPlugins(): GameSystemPlugin[] {
    // Return client-side plugins that are available
    // These are loaded from the server and cached locally
    return Array.from(this.clientPlugins.values());
  }
  
  /**
   * Initialize and load plugins from server
   */
  async loadPluginsFromServer(): Promise<void> {
    try {
      // Fetch plugins from server API
      const response = await fetch('/api/plugins');
      if (!response.ok) {
        throw new Error(`Failed to fetch plugins: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch plugins');
      }
      
      // Convert server plugins to client plugins
      for (const serverPlugin of data.data) {
        const clientPlugin: GameSystemPlugin = {
          gameSystem: serverPlugin.config.id,
          characterTypes: ['character', 'npc'],
          itemTypes: ['weapon', 'armor', 'consumable', 'tool'],
          id: serverPlugin.config.id,
          name: serverPlugin.config.name,
          version: serverPlugin.config.version || '1.0.0',
          description: serverPlugin.config.description,
          author: serverPlugin.config.author,
          async onLoad() {
            console.log(`Loading ${serverPlugin.config.name} plugin`);
          },
          async onUnload() {
            console.log(`Unloading ${serverPlugin.config.name} plugin`);
          },
          registerComponents() {
            console.log(`Registering ${serverPlugin.config.name} components`);
          },
          registerMechanics() {
            console.log(`Registering ${serverPlugin.config.name} mechanics`);
          }
        };
        
        this.clientPlugins.set(clientPlugin.id, clientPlugin);
      }
      
      console.log(`Loaded ${this.clientPlugins.size} plugins from server`);
    } catch (error) {
      console.error('Failed to load plugins from server:', error);
      console.log('No fallback plugin available - will try direct plugin loading');
    }
  }
  
  
  /**
   * Get a specific game system plugin
   */
  getGameSystemPlugin(id: string): GameSystemPlugin | null {
    return this.clientPlugins.get(id) || null;
  }
  
  /**
   * Load a game system plugin
   */
  async loadGameSystemPlugin(id: string): Promise<GameSystemPlugin | null> {
    const plugin = this.getGameSystemPlugin(id);
    if (plugin && !this.loadedPlugins.has(id)) {
      await this.initializePlugin(plugin);
    }
    return plugin;
  }
  
  /**
   * Get a component by game system and component type
   */
  async getComponent(gameSystemId: string, componentType: string): Promise<Component | null> {
    console.log(`[PluginRegistry] Getting component: ${gameSystemId}-${componentType}`);
    await this.ensurePluginLoaded(gameSystemId);
    
    const componentId = `${gameSystemId}-${componentType}`;
    const component = this.componentRegistry.get(componentId);
    
    console.log(`[PluginRegistry] Component found:`, !!component);
    console.log(`[PluginRegistry] Available components:`, this.componentRegistry.list().map(c => c.id));
    
    return component || null;
  }
  
  /**
   * Get component by direct ID
   */
  getComponentById(componentId: string): Component | null {
    return this.componentRegistry.get(componentId) || null;
  }
  
  /**
   * Force re-initialization of a plugin (for debugging)
   */
  async forceReinitializePlugin(gameSystemId: string): Promise<void> {
    console.log(`[PluginRegistry] Force re-initializing plugin: ${gameSystemId}`);
    
    // Remove from loaded plugins to force re-init
    this.loadedPlugins.delete(gameSystemId);
    
    // Clear any existing components for this plugin
    this.componentRegistry.unregisterByPlugin(gameSystemId);
    this.mechanicsRegistry.unregisterByPlugin(gameSystemId);
    
    // Force reload
    await this.ensurePluginLoaded(gameSystemId);
  }
  
  /**
   * Get all components for a game system
   */
  getComponentsForGameSystem(gameSystemId: string): Array<{ id: string; component: Component; metadata: ComponentMetadata }> {
    return this.componentRegistry.getByPlugin(gameSystemId);
  }
  
  /**
   * Ensure a plugin is loaded and initialized
   */
  private async ensurePluginLoaded(gameSystemId: string): Promise<GameSystemPlugin | null> {
    console.log(`[PluginRegistry] Ensuring plugin loaded: ${gameSystemId}`);
    console.log(`[PluginRegistry] Currently loaded plugins:`, Array.from(this.loadedPlugins.keys()));
    
    if (!this.loadedPlugins.has(gameSystemId)) {
      console.log(`[PluginRegistry] Plugin not loaded, loading now...`);
      const plugin = await this.loadGameSystemPlugin(gameSystemId);
      if (plugin) {
        await this.initializePlugin(plugin);
      }
      return plugin;
    }
    return this.loadedPlugins.get(gameSystemId) || null;
  }
  
  /**
   * Initialize a plugin with context and register its components
   */
  private async initializePlugin(plugin: GameSystemPlugin): Promise<void> {
    try {
      console.log(`[PluginRegistry] Initializing plugin: ${plugin.name}`);
      
      // Create plugin context
      const context = this.createPluginContext(plugin);
      
      // Call plugin onLoad
      await plugin.onLoad(context);
      
      // Register components
      console.log(`[PluginRegistry] Calling registerComponents for ${plugin.name}`);
      plugin.registerComponents(this.componentRegistry);
      console.log(`[PluginRegistry] Components registered, now have:`, this.componentRegistry.list().length);
      
      // Register mechanics
      console.log(`[PluginRegistry] Calling registerMechanics for ${plugin.name}`);
      plugin.registerMechanics(this.mechanicsRegistry);
      console.log(`[PluginRegistry] Mechanics registered, now have:`, this.mechanicsRegistry.list().length);
      
      // Mark as loaded
      this.loadedPlugins.set(plugin.id, plugin);
      
      console.log(`[PluginRegistry] Plugin ${plugin.name} initialized successfully`);
    } catch (error) {
      console.error(`[PluginRegistry] Failed to initialize plugin ${plugin.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Load the D&D 5e plugin using static import
   */
  private async loadDnD5ePlugin(): Promise<void> {
    try {
      console.log('[PluginRegistry] Loading D&D 5e plugin via static import...');
      
      if (DnD5ePlugin) {
        console.log('[PluginRegistry] Plugin imported successfully:', DnD5ePlugin.name);
        console.log('[PluginRegistry] Plugin ID:', DnD5ePlugin.id);
        
        // Add to client plugins
        this.clientPlugins.set(DnD5ePlugin.id, DnD5ePlugin);
        
        // Initialize if not already loaded
        if (!this.loadedPlugins.has(DnD5ePlugin.id)) {
          console.log('[PluginRegistry] Initializing D&D 5e plugin...');
          await this.initializePlugin(DnD5ePlugin);
        } else {
          console.log('[PluginRegistry] D&D 5e plugin already loaded');
        }
      } else {
        console.error('[PluginRegistry] DnD5ePlugin import returned null/undefined');
      }
      
      console.log('[PluginRegistry] D&D 5e plugin loading completed');
    } catch (error) {
      console.error('[PluginRegistry] Failed to load D&D 5e plugin:', error);
    }
  }
  
  /**
   * Create plugin context for a plugin
   */
  private createPluginContext(plugin: GameSystemPlugin): PluginContext {
    // TODO: Get real socket connection from socket store
    // For now, create a mock socket connection that implements SocketConnection interface
    const mockSocket = {
      emit: (event: string, ...args: unknown[]) => {
        console.log(`[Plugin ${plugin.id}] Socket emit:`, event, args);
        // If last arg is a callback, call it with success
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
    
    // Use the real PluginContextImpl
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