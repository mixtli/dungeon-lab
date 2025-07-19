import type { 
  GameSystemPlugin, 
  PluginContext,
  PluginStore,
  PluginEventSystem
} from '@dungeon-lab/shared/types/plugin.mjs';
import type { ComponentRegistry, ComponentMetadata, PluginComponent } from '@dungeon-lab/shared/types/component-registry.mjs';
import type { MechanicsRegistry, GameMechanic, MechanicMetadata } from '@dungeon-lab/shared/types/mechanics-registry.mjs';
import { PluginComponentUtils } from '@dungeon-lab/shared/base/vue-component.mjs';

/**
 * Component registry implementation
 */
class ComponentRegistryImpl implements ComponentRegistry {
  private components = new Map<string, { component: PluginComponent; metadata: ComponentMetadata }>();
  
  register(id: string, component: PluginComponent, metadata?: ComponentMetadata): void {
    if (this.components.has(id)) {
      console.warn(`Component ${id} is already registered, overwriting`);
    }
    
    const fullMetadata: ComponentMetadata = {
      pluginId: metadata?.pluginId || 'unknown',
      name: metadata?.name || id,
      description: metadata?.description,
      category: metadata?.category,
      props: metadata?.props,
      events: metadata?.events,
      hotReloadable: metadata?.hotReloadable ?? true
    };
    
    this.components.set(id, { component, metadata: fullMetadata });
  }
  
  get(id: string): PluginComponent | undefined {
    return this.components.get(id)?.component;
  }
  
  getByPlugin(pluginId: string) {
    const result = [];
    for (const [id, { component, metadata }] of this.components) {
      if (metadata.pluginId === pluginId) {
        result.push({ id, component, metadata });
      }
    }
    return result;
  }
  
  unregister(id: string): boolean {
    return this.components.delete(id);
  }
  
  list(): Array<{ id: string; component: PluginComponent; metadata: ComponentMetadata }> {
    const result = [];
    for (const [id, { component, metadata }] of this.components) {
      result.push({ id, component, metadata });
    }
    return result;
  }

  unregisterByPlugin(pluginId: string): void {
    for (const [id, { metadata }] of this.components) {
      if (metadata.pluginId === pluginId) {
        this.components.delete(id);
      }
    }
  }
}

/**
 * Mechanics registry implementation
 */
class MechanicsRegistryImpl implements MechanicsRegistry {
  private mechanics = new Map<string, { mechanic: GameMechanic; metadata: MechanicMetadata }>();
  
  register(id: string, mechanic: GameMechanic, metadata?: MechanicMetadata): void {
    if (this.mechanics.has(id)) {
      console.warn(`Mechanic ${id} is already registered, overwriting`);
    }
    
    const fullMetadata: MechanicMetadata = {
      pluginId: metadata?.pluginId || 'unknown',
      name: metadata?.name || id,
      description: metadata?.description,
      category: metadata?.category,
      version: metadata?.version || '1.0.0'
    };
    
    this.mechanics.set(id, { mechanic, metadata: fullMetadata });
  }
  
  get(id: string): GameMechanic | undefined {
    return this.mechanics.get(id)?.mechanic;
  }
  
  getByPlugin(pluginId: string) {
    const result = [];
    for (const [id, { mechanic, metadata }] of this.mechanics) {
      if (metadata.pluginId === pluginId) {
        result.push({ id, mechanic, metadata });
      }
    }
    return result;
  }
  
  unregister(id: string): boolean {
    return this.mechanics.delete(id);
  }
  
  list(): Array<{ id: string; mechanic: GameMechanic; metadata: MechanicMetadata }> {
    const result = [];
    for (const [id, { mechanic, metadata }] of this.mechanics) {
      result.push({ id, mechanic, metadata });
    }
    return result;
  }

  unregisterByPlugin(pluginId: string): void {
    for (const [id, { metadata }] of this.mechanics) {
      if (metadata.pluginId === pluginId) {
        this.mechanics.delete(id);
      }
    }
  }
}

/**
 * Plugin store implementation
 */
export class PluginStoreImpl implements PluginStore {
  private store = new Map<string, unknown>();
  
  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }
  
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
  
  has(key: string): boolean {
    return this.store.has(key);
  }
  
  delete(key: string): boolean {
    return this.store.delete(key);
  }
  
  clear(): void {
    this.store.clear();
  }
  
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  subscribe<T>(_key: string, _callback: (value: T) => void): () => void {
    // Simple implementation - could be enhanced with proper subscription management
    // For now, just return a no-op unsubscribe function
    return () => {};
  }
}

/**
 * Plugin event system implementation
 */
export class PluginEventSystemImpl implements PluginEventSystem {
  private events = PluginComponentUtils.createEventEmitter();
  
  emit<T = unknown>(event: string, data?: T): void {
    this.events.emit(event, data);
  }
  
  on<T = unknown>(event: string, handler: (data: T) => void): () => void {
    return this.events.on(event, handler as (data: unknown) => void);
  }
}

/**
 * Main plugin registry service
 */
export class PluginRegistryService {
  private clientPlugins: Map<string, GameSystemPlugin> = new Map();
  private initialized = false;
  
  constructor() {
    // Component and mechanics registries are available as exports but not used in this simplified version
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
    return this.initialize();
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
          async onLoad(_context: PluginContext) {
            console.log(`Loading ${serverPlugin.config.name} plugin`);
          },
          async onUnload() {
            console.log(`Unloading ${serverPlugin.config.name} plugin`);
          },
          registerComponents(_registry: ComponentRegistry) {
            console.log(`Registering ${serverPlugin.config.name} components`);
          },
          registerMechanics(_registry: MechanicsRegistry) {
            console.log(`Registering ${serverPlugin.config.name} mechanics`);
          }
        };
        
        this.clientPlugins.set(clientPlugin.id, clientPlugin);
      }
      
      console.log(`Loaded ${this.clientPlugins.size} plugins from server`);
    } catch (error) {
      console.error('Failed to load plugins from server:', error);
      // Fall back to hardcoded plugin
      this.loadFallbackPlugin();
    }
  }
  
  /**
   * Load fallback plugin if server loading fails
   */
  private loadFallbackPlugin(): void {
    const fallbackPlugin: GameSystemPlugin = {
      gameSystem: 'dnd-5e-2024',
      characterTypes: ['character', 'npc'],
      itemTypes: ['weapon', 'armor', 'consumable', 'tool'],
      id: 'dnd-5e-2024',
      name: 'D&D 5e (2024)',
      version: '1.0.0',
      description: 'Dungeons & Dragons 5th Edition (2024 Rules)',
      author: 'Dungeon Lab Team',
      async onLoad(_context: PluginContext) {
        console.log('Loading D&D 5e plugin');
      },
      async onUnload() {
        console.log('Unloading D&D 5e plugin');
      },
      registerComponents(_registry: ComponentRegistry) {
        console.log('Registering D&D 5e components');
      },
      registerMechanics(_registry: MechanicsRegistry) {
        console.log('Registering D&D 5e mechanics');
      }
    };
    
    this.clientPlugins.set(fallbackPlugin.id, fallbackPlugin);
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
    return this.getGameSystemPlugin(id);
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