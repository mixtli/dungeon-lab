import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Plugin, PluginConfig, PluginRegistry, GameSystemPlugin } from '@dungeon-lab/shared';
import { logger } from '../utils/logger.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the plugins directory (relative to the server package)
const PLUGINS_DIR = path.resolve(__dirname, '../../../plugins');

/**
 * Plugin Registry Service
 * This service handles loading plugins from config.json files in the plugins directory
 */
export class PluginRegistryService implements PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private gameSystemPlugins: Map<string, GameSystemPlugin> = new Map();
  
  /**
   * Initialize the plugin registry
   */
  async initialize(): Promise<void> {
    logger.info('Initializing plugin registry...');
    
    try {
      // Ensure the plugins directory exists
      if (!fs.existsSync(PLUGINS_DIR)) {
        logger.warn(`Plugins directory not found at ${PLUGINS_DIR}`);
        return;
      }
      
      // Get all directories in the plugins directory
      const pluginDirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      logger.info(`Found ${pluginDirs.length} potential plugin directories`);
      
      // Load each plugin
      for (const pluginDir of pluginDirs) {
        await this.loadPlugin(pluginDir);
      }
      
      logger.info(`Loaded ${this.plugins.size} plugins (${this.gameSystemPlugins.size} game systems)`);
    } catch (error) {
      logger.error('Error initializing plugin registry:', error);
      throw error;
    }
  }
  
  /**
   * Load a plugin from its directory
   * @param pluginDirName The name of the plugin directory
   */
  private async loadPlugin(pluginDirName: string): Promise<void> {
    const pluginDir = path.join(PLUGINS_DIR, pluginDirName);
    const configFile = path.join(pluginDir, 'config.json');
    
    // Check if config.json exists
    if (!fs.existsSync(configFile)) {
      logger.warn(`Plugin ${pluginDirName} is missing config.json, skipping`);
      return;
    }
    
    try {
      // Read and parse the config file
      const configContent = fs.readFileSync(configFile, 'utf8');
      const config = JSON.parse(configContent) as PluginConfig;
      
      // Validate the config
      if (!this.validatePluginConfig(config)) {
        logger.warn(`Invalid config for plugin ${pluginDirName}, skipping`);
        return;
      }
      
      // Create plugin instance
      const plugin: Plugin = {
        id: config.id,
        name: config.name,
        version: config.version,
        description: config.description,
        author: config.author,
        website: config.website,
        type: config.type,
        enabled: config.enabled !== false, // Default to enabled if not specified
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store the plugin
      this.plugins.set(plugin.id, plugin);
      
      // If this is a game system plugin and it has a server entry point, load it
      if (config.type === 'gameSystem' && config.serverEntryPoint) {
        await this.loadGameSystemPlugin(plugin, pluginDir, config);
      }
    } catch (error) {
      logger.error(`Error loading plugin ${pluginDirName}:`, error);
    }
  }
  
  /**
   * Load a game system plugin
   * @param plugin The base plugin object
   * @param pluginDir The plugin directory path
   * @param config The plugin configuration
   */
  private async loadGameSystemPlugin(
    plugin: Plugin, 
    pluginDir: string, 
    config: PluginConfig
  ): Promise<void> {
    try {
      if (!config.serverEntryPoint) return;
      
      // Resolve the server entry point
      const serverEntryPath = path.join(pluginDir, config.serverEntryPoint);
      
      // Import the plugin module dynamically
      const importPath = `file://${serverEntryPath}`;
      const pluginModule = await import(importPath);
      
      // Get the default export as the game system plugin
      const gameSystemPlugin = pluginModule.default as GameSystemPlugin;
      
      if (!gameSystemPlugin) {
        logger.warn(`Plugin ${plugin.id} does not export a default game system plugin`);
        return;
      }
      
      // Combine the base plugin properties with the game system plugin
      const combinedPlugin: GameSystemPlugin = {
        ...plugin,
        ...gameSystemPlugin,
        type: 'gameSystem',
        id: plugin.id
      };
      
      // Store the game system plugin
      this.gameSystemPlugins.set(plugin.id, combinedPlugin);
      
      // Initialize the plugin
      await combinedPlugin.initialize();
      
      logger.info(`Loaded game system plugin: ${plugin.name} (${plugin.id})`);
    } catch (error) {
      logger.error(`Error loading game system plugin ${plugin.id}:`, error);
    }
  }
  
  /**
   * Validate a plugin configuration
   * @param config The plugin configuration to validate
   * @returns True if the configuration is valid, false otherwise
   */
  private validatePluginConfig(config: PluginConfig): boolean {
    // Check required fields
    if (!config.id || !config.name || !config.version || !config.type) {
      return false;
    }
    
    // Check that the type is valid
    if (!['gameSystem', 'extension', 'theme'].includes(config.type)) {
      return false;
    }
    
    // For game system plugins, a server entry point should be provided
    if (config.type === 'gameSystem' && !config.serverEntryPoint) {
      logger.warn(`Game system plugin ${config.id} is missing serverEntryPoint`);
    }
    
    return true;
  }
  
  /**
   * Get a plugin by ID
   * @param pluginId The plugin ID
   * @returns The plugin, or undefined if not found
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * Get a game system plugin by ID
   * @param pluginId The plugin ID
   * @returns The game system plugin, or undefined if not found
   */
  getGameSystemPlugin(pluginId: string): GameSystemPlugin | undefined {
    return this.gameSystemPlugins.get(pluginId);
  }
  
  /**
   * Get all plugins
   * @returns Array of all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get all game system plugins
   * @returns Array of all game system plugins
   */
  getAllGameSystemPlugins(): GameSystemPlugin[] {
    return Array.from(this.gameSystemPlugins.values());
  }
  
  /**
   * Get all enabled plugins
   * @returns Array of all enabled plugins
   */
  getEnabledPlugins(): Plugin[] {
    return this.getAllPlugins().filter(plugin => plugin.enabled);
  }
}

// Export a singleton instance of the PluginRegistryService
export const pluginRegistry = new PluginRegistryService(); 