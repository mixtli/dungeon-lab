import type { Plugin, PluginContext } from '@dungeon-lab/shared/types/plugin.mjs';
import type { ComponentRegistry } from '@dungeon-lab/shared/types/component-registry.mjs';
import type { MechanicsRegistry } from '@dungeon-lab/shared/types/mechanics-registry.mjs';
import { createPluginContext, type SocketConnection } from './plugin-context-impl.mjs';

/**
 * Plugin lifecycle states
 */
export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  REGISTERING = 'registering',
  REGISTERED = 'registered',
  UNLOADING = 'unloading',
  ERROR = 'error'
}

/**
 * Plugin lifecycle manager
 */
export class PluginLifecycleManager {
  private plugins = new Map<string, PluginEntry>();
  private contexts = new Map<string, PluginContext>();
  private componentRegistry: ComponentRegistry;
  private mechanicsRegistry: MechanicsRegistry;
  private socketConnection: SocketConnection;
  
  constructor(
    componentRegistry: ComponentRegistry,
    mechanicsRegistry: MechanicsRegistry,
    socketConnection: SocketConnection
  ) {
    this.componentRegistry = componentRegistry;
    this.mechanicsRegistry = mechanicsRegistry;
    this.socketConnection = socketConnection;
  }
  
  /**
   * Load a plugin into the system
   */
  async loadPlugin(plugin: Plugin): Promise<void> {
    const entry = this.getOrCreatePluginEntry(plugin);
    
    if (entry.state === PluginState.LOADED || entry.state === PluginState.REGISTERED) {
      return; // Already loaded
    }
    
    try {
      entry.state = PluginState.LOADING;
      
      // Create plugin context
      const context = await this.createPluginContext(plugin);
      this.contexts.set(plugin.id, context);
      
      // Call plugin's onLoad method
      await plugin.onLoad(context);
      
      entry.state = PluginState.LOADED;
      entry.loadedAt = new Date();
      
    } catch (error) {
      entry.state = PluginState.ERROR;
      entry.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  
  /**
   * Register a plugin's components and mechanics
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    const entry = this.getOrCreatePluginEntry(plugin);
    
    if (entry.state !== PluginState.LOADED) {
      throw new Error(`Plugin ${plugin.id} must be loaded before registration`);
    }
    
    try {
      entry.state = PluginState.REGISTERING;
      
      // Register components
      plugin.registerComponents(this.componentRegistry);
      
      // Register mechanics
      plugin.registerMechanics(this.mechanicsRegistry);
      
      entry.state = PluginState.REGISTERED;
      entry.registeredAt = new Date();
      
    } catch (error) {
      entry.state = PluginState.ERROR;
      entry.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  
  /**
   * Unload a plugin from the system
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry || entry.state === PluginState.UNLOADED) {
      return; // Already unloaded
    }
    
    try {
      entry.state = PluginState.UNLOADING;
      
      // Unregister components and mechanics
      this.componentRegistry.unregisterByPlugin(pluginId);
      this.mechanicsRegistry.unregisterByPlugin(pluginId);
      
      // Call plugin's onUnload method
      await entry.plugin.onUnload();
      
      // Clean up context
      this.contexts.delete(pluginId);
      
      entry.state = PluginState.UNLOADED;
      entry.unloadedAt = new Date();
      
    } catch (error) {
      entry.state = PluginState.ERROR;
      entry.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }
  
  /**
   * Reload a plugin (unload then load)
   */
  async reloadPlugin(pluginId: string, newPlugin?: Plugin): Promise<void> {
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    await this.unloadPlugin(pluginId);
    
    const pluginToLoad = newPlugin || entry.plugin;
    await this.loadPlugin(pluginToLoad);
    await this.registerPlugin(pluginToLoad);
  }
  
  /**
   * Get plugin state
   */
  getPluginState(pluginId: string): PluginState {
    const entry = this.plugins.get(pluginId);
    return entry?.state || PluginState.UNLOADED;
  }
  
  /**
   * Get plugin entry
   */
  getPluginEntry(pluginId: string): PluginEntry | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * Get all plugin entries
   */
  getAllPluginEntries(): PluginEntry[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Check if plugin is loaded and registered
   */
  isPluginReady(pluginId: string): boolean {
    const entry = this.plugins.get(pluginId);
    return entry?.state === PluginState.REGISTERED;
  }
  
  private getOrCreatePluginEntry(plugin: Plugin): PluginEntry {
    let entry = this.plugins.get(plugin.id);
    if (!entry) {
      entry = {
        plugin,
        state: PluginState.UNLOADED,
        createdAt: new Date()
      };
      this.plugins.set(plugin.id, entry);
    } else {
      // Update plugin instance if different
      entry.plugin = plugin;
    }
    return entry;
  }
  
  private async createPluginContext(plugin: Plugin): Promise<PluginContext> {
    // Create real plugin context with socket connection
    return createPluginContext(this.socketConnection, plugin.id);
  }
}

/**
 * Plugin entry with lifecycle tracking
 */
export interface PluginEntry {
  plugin: Plugin;
  state: PluginState;
  createdAt: Date;
  loadedAt?: Date;
  registeredAt?: Date;
  unloadedAt?: Date;
  error?: string;
}

/**
 * Plugin lifecycle events
 */
export interface PluginLifecycleEvents {
  'plugin:loading': { pluginId: string };
  'plugin:loaded': { pluginId: string };
  'plugin:registering': { pluginId: string };
  'plugin:registered': { pluginId: string };
  'plugin:unloading': { pluginId: string };
  'plugin:unloaded': { pluginId: string };
  'plugin:error': { pluginId: string; error: string };
}