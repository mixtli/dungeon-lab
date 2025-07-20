/**
 * Plugin lifecycle states
 * Shared types for plugin lifecycle management
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
 * Plugin entry with lifecycle tracking
 */
export interface PluginEntry {
  plugin: unknown; // Plugin type from plugin.mjs may cause circular dependency
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