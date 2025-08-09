import type { PluginContext } from '../types/plugin-context.mjs';

// Extend Window interface to include the plugin registry
declare global {
  interface Window {
    __DUNGEON_LAB_PLUGIN_REGISTRY__?: {
      getGameSystemPlugin(id: string): { getContext(): PluginContext | undefined } | null;
    };
  }
}

/**
 * Get the plugin context for the currently active game system
 * 
 * This utility function encapsulates the logic for accessing the active plugin context
 * based on localStorage.activeGameSystem. It can be imported by both web components
 * and plugin components without violating module boundaries.
 * 
 * @returns The active plugin context, or undefined if not available
 */
export function getPluginContext(): PluginContext | undefined {
  try {
    // Get active game system from localStorage
    const activeGameSystem = localStorage.getItem('activeGameSystem');
    if (!activeGameSystem) {
      console.warn('[getPluginContext] No active game system found in localStorage');
      return undefined;
    }
    
    // Import plugin registry dynamically to avoid circular dependencies
    // Note: This assumes the plugin registry is available globally or through a known path
    // We'll need to make sure this works in both web and plugin contexts
    
    // For now, we'll use a runtime check to determine the environment
    // and import the appropriate registry
    let pluginRegistry;
    
    if (typeof window !== 'undefined' && window.__DUNGEON_LAB_PLUGIN_REGISTRY__) {
      // Web environment - use global registry
      pluginRegistry = window.__DUNGEON_LAB_PLUGIN_REGISTRY__;
    } else {
      console.warn('[getPluginContext] Plugin registry not available in this environment');
      return undefined;
    }
    
    // Get the plugin for the active game system
    const plugin = pluginRegistry.getGameSystemPlugin(activeGameSystem);
    if (!plugin) {
      console.warn(`[getPluginContext] Plugin not found for active game system: ${activeGameSystem}`);
      return undefined;
    }
    
    // Get context from the plugin
    const context = plugin.getContext();
    if (!context) {
      console.warn(`[getPluginContext] Plugin context not available for: ${activeGameSystem}`);
      return undefined;
    }
    
    return context;
    
  } catch (error) {
    console.error('[getPluginContext] Error getting plugin context:', error);
    return undefined;
  }
}

/**
 * Type declaration for global plugin registry
 * This allows TypeScript to understand the global registry
 */
declare global {
  interface Window {
    __DUNGEON_LAB_PLUGIN_REGISTRY__?: {
      getGameSystemPlugin(id: string): { getContext(): PluginContext | undefined } | null;
    };
  }
}