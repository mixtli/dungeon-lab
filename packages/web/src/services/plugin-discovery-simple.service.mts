import type { PluginManifest } from '@dungeon-lab/shared/schemas/plugin-manifest.schema.mjs';
import type { GameSystemPlugin } from '@dungeon-lab/shared/types/plugin-simple.mjs';

/**
 * Simple Plugin Discovery Service
 * 
 * Uses the proven patterns from our tests:
 * 1. Vite glob imports for manifest discovery 
 * 2. Workspace aliases for plugin imports
 * 3. No HTTP calls, no complex fallbacks
 */

export interface DiscoveredPlugin {
  id: string;
  manifest: PluginManifest;
  instance: GameSystemPlugin;
}

export class SimplePluginDiscoveryService {
  private plugins = new Map<string, DiscoveredPlugin>();
  private initialized = false;

  /**
   * Discover and load all enabled plugins using Vite glob imports for everything
   */
  async discoverPlugins(): Promise<DiscoveredPlugin[]> {
    if (this.initialized) {
      return Array.from(this.plugins.values());
    }

    try {
      console.log('🔍 Starting simple plugin discovery...');

      // Step 1: Find all manifests using Vite glob pattern
      const manifestModules = import.meta.glob(
        '@/../../plugins/*/manifest.json',
        { eager: true, import: 'default' }
      );

      // Step 2: Find all plugin entry points using Vite glob pattern
      const pluginModules = import.meta.glob(
        '@/../../plugins/*/src/index.mts',
        { import: 'default' }
      );

      console.log('📋 Found manifests:', Object.keys(manifestModules));
      console.log('🔌 Found plugin modules:', pluginModules);

      // Step 3: Process each manifest and match with its plugin module
      for (const [manifestPath, manifestData] of Object.entries(manifestModules)) {
        const manifest = manifestData as PluginManifest;
        
        if (!manifest.enabled) {
          console.log(`⏭️ Skipping disabled plugin: ${manifest.id}`);
          continue;
        }

        try {
          console.log(`📦 Loading enabled plugin: ${manifest.id}`);

          // Step 4: Find the corresponding plugin module
          // manifestPath: '../plugins/dnd-5e-2024/manifest.json'
          // pluginPath:  '../plugins/dnd-5e-2024/src/index.mjs'
          const pluginPath = manifestPath.replace('/manifest.json', '/src/index.mts');
          
          if (!(pluginPath in pluginModules)) {
            console.error(`❌ No plugin module found for ${manifest.id} at ${pluginPath}`);
            continue;
          }

          console.log(`🔗 Loading plugin from: ${pluginPath}`);

          // Step 5: Import the plugin module using Vite's resolved import
          const pluginLoader = pluginModules[pluginPath];
          const pluginModule = await pluginLoader();
          const PluginClass = pluginModule.default || pluginModule;

          if (!PluginClass || typeof PluginClass !== 'function') {
            console.error(`❌ Plugin ${manifest.id} does not export a valid class`);
            continue;
          }

          // Step 6: Create plugin instance (registry will initialize with context)
          const instance = new PluginClass();
          console.log(`✅ Plugin instance created: ${instance.manifest.name}`);

          // Store the plugin
          const plugin: DiscoveredPlugin = {
            id: manifest.id,
            manifest,
            instance
          };

          this.plugins.set(manifest.id, plugin);
          console.log(`✅ Successfully loaded: ${manifest.name}`);

        } catch (error) {
          console.error(`❌ Failed to load plugin ${manifest.id}:`, error);
        }
      }

      this.initialized = true;
      console.log(`🎉 Simple plugin discovery complete. Loaded ${this.plugins.size} plugins.`);
      return Array.from(this.plugins.values());

    } catch (error) {
      console.error('❌ Plugin discovery failed:', error);
      return [];
    }
  }

  /**
   * Get available plugin IDs
   */
  getAvailablePluginIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugin instance by ID
   */
  async loadPluginModule(pluginId: string): Promise<GameSystemPlugin | null> {
    const plugin = this.plugins.get(pluginId);
    return plugin ? plugin.instance : null;
  }

  /**
   * Get plugin manifest by ID
   */
  getPluginManifest(pluginId: string): PluginManifest | undefined {
    const plugin = this.plugins.get(pluginId);
    return plugin ? plugin.manifest : undefined;
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): DiscoveredPlugin | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Get all discovered plugins
   */
  getAllPlugins(): DiscoveredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Clear all plugins (for testing)
   */
  clear(): void {
    this.plugins.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const simplePluginDiscovery = new SimplePluginDiscoveryService();