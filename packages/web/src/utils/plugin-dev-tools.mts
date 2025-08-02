import { pluginRegistry } from '../services/plugin-registry.mjs';
import type { GameSystemPlugin } from '@dungeon-lab/shared/types/plugin.mjs';

/**
 * Plugin development tools for the browser console
 */
class PluginDevTools {
  /**
   * Load a plugin for testing
   */
  static async loadPlugin(pluginPath: string): Promise<GameSystemPlugin | null> {
    console.log(`[Dev Tools] Loading plugin: ${pluginPath}`);
    try {
      // Plugin loading is now handled by server auto-discovery
      console.log(`[Dev Tools] Plugin loading handled by server auto-discovery`);
      return null;
    } catch (error) {
      console.error(`[Dev Tools] Failed to load plugin:`, error);
      throw error;
    }
  }
  
  /**
   * Unload a plugin
   */
  static async unloadPlugin(pluginId: string): Promise<void> {
    console.log(`[Dev Tools] Unloading plugin: ${pluginId}`);
    try {
      // Plugin unloading is now handled by server
      console.log(`[Dev Tools] Plugin unloading handled by server`);
    } catch (error) {
      console.error(`[Dev Tools] Failed to unload plugin:`, error);
      throw error;
    }
  }
  
  /**
   * Hot reload a plugin
   */
  static async reloadPlugin(pluginId: string): Promise<void> {
    console.log(`[Dev Tools] Hot reloading plugin: ${pluginId}`);
    try {
      // Plugin reloading is now handled by server auto-discovery
      console.log(`[Dev Tools] Plugin reloading handled by server`);
    } catch (error) {
      console.error(`[Dev Tools] Failed to reload plugin:`, error);
      throw error;
    }
  }
  
  /**
   * List all loaded plugins
   */
  static listPlugins(): void {
    const plugins = pluginRegistry.getPlugins();
    console.log(`[Dev Tools] Loaded plugins (${plugins.length}):`, plugins);
  }
  
  /**
   * Get plugin info
   */
  static getPluginInfo(pluginId: string): void {
    const plugin = pluginRegistry.getGameSystemPlugin(pluginId);
    if (plugin) {
      console.log(`[Dev Tools] Plugin info:`, {
        id: plugin.manifest.id,
        name: plugin.manifest.name,
        version: plugin.manifest.version,
        description: plugin.manifest.description,
        author: plugin.manifest.author,
        gameSystem: plugin.manifest.gameSystem
      });
    } else {
      console.log(`[Dev Tools] Plugin not found: ${pluginId}`);
    }
  }
  
  /**
   * List components from a plugin
   */
  static listComponents(pluginId?: string): void {
    console.log(`[Dev Tools] Component registry access not available in simplified architecture`);
    if (pluginId) {
      console.log(`[Dev Tools] Requested components from ${pluginId}`);
    }
  }
  
  /**
   * List mechanics from a plugin
   */
  static listMechanics(pluginId?: string): void {
    console.log(`[Dev Tools] Mechanics registry access not available in simplified architecture`);
    if (pluginId) {
      console.log(`[Dev Tools] Requested mechanics from ${pluginId}`);
    }
  }
  
  /**
   * Test plugin quick load for common plugins
   */
  static async quickLoad(): Promise<void> {
    const commonPlugins = [
      '../../plugins/dnd-5e-2024-old/src/web/index.mts'
    ];
    
    console.log(`[Dev Tools] Quick loading common plugins...`);
    
    for (const pluginPath of commonPlugins) {
      try {
        await this.loadPlugin(pluginPath);
      } catch (error) {
        console.warn(`[Dev Tools] Could not load ${pluginPath}:`, error);
      }
    }
  }
  
  /**
   * Clear all plugins (for testing)
   */
  static async clearAll(): Promise<void> {
    console.log(`[Dev Tools] Clearing all plugins...`);
    const plugins = pluginRegistry.getPlugins();
    
    for (const plugin of plugins) {
      try {
        await this.unloadPlugin(plugin.manifest.id);
      } catch (error) {
        console.error(`[Dev Tools] Failed to unload ${plugin.manifest.id}:`, error);
      }
    }
    
    console.log(`[Dev Tools] All plugins cleared`);
  }
}

/**
 * Extend window object for development tools
 */
declare global {
  interface Window {
    __PLUGIN_DEV_TOOLS__?: typeof PluginDevTools;
    __PLUGIN_REGISTRY__?: typeof pluginRegistry;
  }
}

/**
 * Make plugin dev tools available globally in development
 */
if (import.meta.env.DEV) {
  window.__PLUGIN_DEV_TOOLS__ = PluginDevTools;
  window.__PLUGIN_REGISTRY__ = pluginRegistry;
  
  console.log(`
🔧 Plugin Development Tools Available:
- __PLUGIN_DEV_TOOLS__.loadPlugin(path)
- __PLUGIN_DEV_TOOLS__.unloadPlugin(id)
- __PLUGIN_DEV_TOOLS__.reloadPlugin(id)
- __PLUGIN_DEV_TOOLS__.listPlugins()
- __PLUGIN_DEV_TOOLS__.getPluginInfo(id)
- __PLUGIN_DEV_TOOLS__.listComponents(id?)
- __PLUGIN_DEV_TOOLS__.listMechanics(id?)
- __PLUGIN_DEV_TOOLS__.quickLoad()
- __PLUGIN_DEV_TOOLS__.clearAll()

🔥 Plugin Registry: __PLUGIN_REGISTRY__
  `);
}

export { PluginDevTools };