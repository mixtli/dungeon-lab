import type { Plugin } from '@dungeon-lab/shared/types/plugin.mjs';

/**
 * Plugin loader interface for loading plugins dynamically
 */
export interface PluginLoader {
  /**
   * Load a plugin from a given path
   * @param pluginPath Path to plugin entry point
   * @returns Loaded plugin instance
   */
  loadPlugin(pluginPath: string): Promise<Plugin>;
  
  /**
   * Check if a plugin is loadable
   * @param pluginPath Path to plugin entry point
   * @returns Whether plugin can be loaded
   */
  canLoadPlugin(pluginPath: string): Promise<boolean>;
  
  /**
   * Get plugin metadata without loading
   * @param pluginPath Path to plugin entry point
   * @returns Plugin metadata
   */
  getPluginMetadata(pluginPath: string): Promise<PluginMetadata>;
}

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  entryPoint: string;
  dependencies?: string[];
}

/**
 * Vite-based plugin loader for development
 */
export class VitePluginLoader implements PluginLoader {
  private loadedModules = new Map<string, Plugin>();
  
  async loadPlugin(pluginPath: string): Promise<Plugin> {
    try {
      // Use dynamic import for Vite hot reload support
      const module = await import(/* @vite-ignore */ pluginPath);
      
      if (!module.default || typeof module.default !== 'object') {
        throw new Error(`Plugin at ${pluginPath} must have a default export`);
      }
      
      const plugin = module.default as Plugin;
      
      // Validate plugin interface
      this.validatePlugin(plugin);
      
      // Cache the loaded plugin
      this.loadedModules.set(pluginPath, plugin);
      
      return plugin;
      
    } catch (error) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async canLoadPlugin(_pluginPath: string): Promise<boolean> {
    try {
      // Check if the path exists and is accessible
      // In a real implementation, this would check file system or network
      return true;
    } catch {
      return false;
    }
  }
  
  async getPluginMetadata(pluginPath: string): Promise<PluginMetadata> {
    try {
      // Try to load just the metadata without full plugin initialization
      const module = await import(/* @vite-ignore */ `${pluginPath}?metadata`);
      
      if (module.metadata) {
        return module.metadata;
      }
      
      // Fallback: load the full plugin to get metadata
      const plugin = await this.loadPlugin(pluginPath);
      return {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        entryPoint: pluginPath,
        dependencies: []
      };
      
    } catch (error) {
      throw new Error(`Failed to get metadata for plugin at ${pluginPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Validate plugin interface
   */
  private validatePlugin(plugin: Plugin): void {
    const requiredFields = ['id', 'name', 'version', 'onLoad', 'onUnload', 'registerComponents', 'registerMechanics'];
    
    for (const field of requiredFields) {
      if (!(field in plugin)) {
        throw new Error(`Plugin missing required field: ${field}`);
      }
    }
    
    if (typeof plugin.onLoad !== 'function') {
      throw new Error('Plugin onLoad must be a function');
    }
    
    if (typeof plugin.onUnload !== 'function') {
      throw new Error('Plugin onUnload must be a function');
    }
    
    if (typeof plugin.registerComponents !== 'function') {
      throw new Error('Plugin registerComponents must be a function');
    }
    
    if (typeof plugin.registerMechanics !== 'function') {
      throw new Error('Plugin registerMechanics must be a function');
    }
  }
  
}

/**
 * Production plugin loader (no hot reload)
 */
export class ProductionPluginLoader implements PluginLoader {
  private loadedModules = new Map<string, Plugin>();
  
  async loadPlugin(pluginPath: string): Promise<Plugin> {
    // Check cache first
    const cached = this.loadedModules.get(pluginPath);
    if (cached) {
      return cached;
    }
    
    try {
      const module = await import(pluginPath);
      
      if (!module.default || typeof module.default !== 'object') {
        throw new Error(`Plugin at ${pluginPath} must have a default export`);
      }
      
      const plugin = module.default as Plugin;
      
      // Validate plugin interface
      this.validatePlugin(plugin);
      
      // Cache the loaded plugin
      this.loadedModules.set(pluginPath, plugin);
      
      return plugin;
      
    } catch (error) {
      throw new Error(`Failed to load plugin from ${pluginPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async canLoadPlugin(pluginPath: string): Promise<boolean> {
    try {
      await import(pluginPath);
      return true;
    } catch {
      return false;
    }
  }
  
  async getPluginMetadata(pluginPath: string): Promise<PluginMetadata> {
    const plugin = await this.loadPlugin(pluginPath);
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      entryPoint: pluginPath,
      dependencies: []
    };
  }
  
  private validatePlugin(plugin: Plugin): void {
    const requiredFields = ['id', 'name', 'version', 'onLoad', 'onUnload', 'registerComponents', 'registerMechanics'];
    
    for (const field of requiredFields) {
      if (!(field in plugin)) {
        throw new Error(`Plugin missing required field: ${field}`);
      }
    }
  }
}

/**
 * Create plugin loader based on environment
 */
export function createPluginLoader(): PluginLoader {
  if (import.meta.env.DEV) {
    return new VitePluginLoader();
  } else {
    return new ProductionPluginLoader();
  }
}