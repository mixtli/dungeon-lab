import type { Plugin, PluginContext, ActorsAPI, ItemsAPI, DocumentsAPI } from '../types/plugin.mjs';
import type { ComponentRegistry } from '../types/component-registry.mjs';
import type { MechanicsRegistry } from '../types/mechanics-registry.mjs';

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
  
  constructor(
    componentRegistry: ComponentRegistry,
    mechanicsRegistry: MechanicsRegistry
  ) {
    this.componentRegistry = componentRegistry;
    this.mechanicsRegistry = mechanicsRegistry;
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
    // This would be implemented with actual API clients and services
    // For now, we create a mock context
    return {
      api: {
        actors: {
          create: async () => { throw new Error('Not implemented'); },
          get: async () => { throw new Error('Not implemented'); },
          update: async () => { throw new Error('Not implemented'); },
          delete: async () => { throw new Error('Not implemented'); },
          list: async () => { throw new Error('Not implemented'); }
        } as ActorsAPI,
        items: {
          create: async () => { throw new Error('Not implemented'); },
          get: async () => { throw new Error('Not implemented'); },
          update: async () => { throw new Error('Not implemented'); },
          delete: async () => { throw new Error('Not implemented'); },
          list: async () => { throw new Error('Not implemented'); }
        } as ItemsAPI,
        documents: {
          create: async () => { throw new Error('Not implemented'); },
          get: async () => { throw new Error('Not implemented'); },
          update: async () => { throw new Error('Not implemented'); },
          delete: async () => { throw new Error('Not implemented'); },
          search: async () => { throw new Error('Not implemented'); }
        } as DocumentsAPI
      },
      store: {
        get: <T,>(key: string): T | undefined => {
          // Would be implemented with actual store
          return undefined;
        },
        set: <T,>(key: string, value: T): void => {
          // Would be implemented with actual store
        },
        subscribe: (key: string, callback: (value: any) => void): (() => void) => {
          // Would be implemented with actual store
          return () => {};
        }
      },
      events: {
        emit: (event: string, data?: any): void => {
          // Would be implemented with actual event system
        },
        on: (event: string, handler: (data: any) => void): (() => void) => {
          // Would be implemented with actual event system
          return () => {};
        }
      }
    };
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