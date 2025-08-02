import type { GameSystemPlugin, PluginManifest } from '@dungeon-lab/shared/types/plugin.mjs';
import { DnD5e2024Plugin } from '@dungeon-lab/plugin-dnd-5e-2024/index.mjs';

/**
 * Plugin discovery service for manifest-based plugin loading
 */
export class PluginDiscoveryService {
  private discoveredPlugins: Map<string, { manifest: PluginManifest; plugin?: GameSystemPlugin }> = new Map();
  
  /**
   * Discover all available plugins by loading their manifests
   */
  async discoverPlugins(): Promise<void> {
    console.log('[PluginDiscovery] Starting plugin discovery...');
    
    try {
      // For now, we know we have the D&D 5e plugin
      // In a more dynamic system, this could scan a plugins directory or registry
      await this.loadPluginManifest('dnd-5e-2024');
      
      console.log(`[PluginDiscovery] Discovered ${this.discoveredPlugins.size} plugins`);
    } catch (error) {
      console.error('[PluginDiscovery] Failed to discover plugins:', error);
    }
  }
  
  /**
   * Load a plugin manifest and optionally the plugin module
   */
  private async loadPluginManifest(pluginId: string): Promise<void> {
    try {
      console.log(`[PluginDiscovery] Loading manifest for plugin: ${pluginId}`);
      
      // Load the manifest file
      const manifestResponse = await fetch(`/plugins/${pluginId}/manifest.json`);
      if (!manifestResponse.ok) {
        throw new Error(`Failed to fetch manifest for ${pluginId}: ${manifestResponse.status}`);
      }
      
      const manifest: PluginManifest = await manifestResponse.json();
      
      // Validate manifest has required fields
      if (!manifest.id || !manifest.name || !manifest.version) {
        throw new Error(`Invalid manifest for ${pluginId}: missing required fields`);
      }
      
      // Store the manifest
      this.discoveredPlugins.set(pluginId, { manifest });
      
      console.log(`[PluginDiscovery] Loaded manifest for ${manifest.name} v${manifest.version}`);
    } catch (error) {
      console.error(`[PluginDiscovery] Failed to load manifest for ${pluginId}:`, error);
    }
  }
  
  /**
   * Get all discovered plugin manifests
   */
  getDiscoveredManifests(): PluginManifest[] {
    return Array.from(this.discoveredPlugins.values()).map(entry => entry.manifest);
  }
  
  /**
   * Get a specific plugin manifest
   */
  getPluginManifest(pluginId: string): PluginManifest | undefined {
    return this.discoveredPlugins.get(pluginId)?.manifest;
  }
  
  /**
   * Load the actual plugin module using dynamic import
   */
  async loadPluginModule(pluginId: string): Promise<GameSystemPlugin | null> {
    const entry = this.discoveredPlugins.get(pluginId);
    if (!entry) {
      console.error(`[PluginDiscovery] No manifest found for plugin: ${pluginId}`);
      return null;
    }
    
    // Return cached plugin if already loaded
    if (entry.plugin) {
      return entry.plugin;
    }
    
    try {
      console.log(`[PluginDiscovery] Loading module for plugin: ${pluginId}`);
      
      // For D&D 5e plugin, we can use the direct import since it's a workspace dependency
      if (pluginId === 'dnd-5e-2024') {
        //const pluginModule = await import('@dungeon-lab/plugins/dnd-5e-2024');
        //const plugin = pluginModule.default as GameSystemPlugin;
        const plugin = new DnD5e2024Plugin();
        if (plugin && typeof plugin === 'object' && plugin.id === pluginId) {
          // Add manifest to plugin
          (plugin as any).manifest = entry.manifest;
          entry.plugin = plugin;
          
          console.log(`[PluginDiscovery] Successfully loaded ${plugin.name} v${plugin.version}`);
          return plugin;
        } else {
          throw new Error(`Invalid plugin module for ${pluginId}`);
        }
      }
      
      // For other plugins, we could implement dynamic loading here
      console.warn(`[PluginDiscovery] Dynamic loading not implemented for plugin: ${pluginId}`);
      return null;
      
    } catch (error) {
      console.error(`[PluginDiscovery] Failed to load plugin module for ${pluginId}:`, error);
      return null;
    }
  }
  
  /**
   * Check if a plugin is available
   */
  hasPlugin(pluginId: string): boolean {
    return this.discoveredPlugins.has(pluginId);
  }
  
  /**
   * Get all available plugin IDs
   */
  getAvailablePluginIds(): string[] {
    return Array.from(this.discoveredPlugins.keys());
  }
}

export const pluginDiscoveryService = new PluginDiscoveryService();