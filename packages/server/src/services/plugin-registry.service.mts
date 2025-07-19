/**
 * Server-side plugin registry with auto-discovery
 * This provides basic validation for game system IDs and discovers plugins automatically
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Plugin {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  validateActorData(type: string, data: unknown): { success: boolean; error?: { message: string } };
  validateVTTDocumentData?(type: string, data: unknown): { success: boolean; error?: { message: string } };
}

interface PluginPackageJson {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dungeonLab?: {
    pluginId: string;
    displayName: string;
    gameSystem: string;
  };
}

class ServerPluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  
  constructor() {
    // Auto-discover plugins on startup
    this.discoverPlugins().catch(error => {
      console.error('Failed to discover plugins:', error);
      // Fall back to hardcoded plugin if discovery fails
      this.registerFallbackPlugin();
    });
  }
  
  private async discoverPlugins(): Promise<void> {
    try {
      // Look for plugins in packages/plugins directory
      const pluginsDir = join(__dirname, '../../../../plugins');
      
      const entries = await readdir(pluginsDir, { withFileTypes: true });
      const pluginDirs = entries.filter(entry => entry.isDirectory());
      
      for (const pluginDir of pluginDirs) {
        await this.loadPluginFromDirectory(join(pluginsDir, pluginDir.name));
      }
      
      console.log(`Discovered ${this.plugins.size} plugins`);
    } catch (error) {
      console.error('Plugin discovery failed:', error);
      this.registerFallbackPlugin();
    }
  }
  
  private async loadPluginFromDirectory(pluginPath: string): Promise<void> {
    try {
      const packageJsonPath = join(pluginPath, 'package.json');
      const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
      const packageJson: PluginPackageJson = JSON.parse(packageJsonContent);
      
      // Check if this is a valid Dungeon Lab plugin
      if (!packageJson.dungeonLab?.pluginId) {
        console.warn(`Plugin at ${pluginPath} is missing dungeonLab.pluginId in package.json`);
        return;
      }
      
      const plugin: Plugin = {
        id: packageJson.dungeonLab.pluginId,
        name: packageJson.dungeonLab.displayName || packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
        author: typeof packageJson.author === 'string' ? packageJson.author : (packageJson.author as unknown as { name: string })?.name,
        validateActorData: (_type: string, data: unknown) => {
          // Basic validation - just check that data is an object
          if (typeof data !== 'object' || data === null) {
            return { success: false, error: { message: 'Actor data must be an object' } };
          }
          
          // For now, accept any valid object
          return { success: true };
        },
        validateVTTDocumentData: (_type: string, data: unknown) => {
          // Basic validation - just check that data is an object
          if (typeof data !== 'object' || data === null) {
            return { success: false, error: { message: 'VTT document data must be an object' } };
          }
          
          // For now, accept any valid object
          return { success: true };
        }
      };
      
      this.registerPlugin(plugin);
      console.log(`Loaded plugin: ${plugin.name} (${plugin.id})`);
    } catch (error) {
      console.error(`Failed to load plugin from ${pluginPath}:`, error);
    }
  }
  
  private registerFallbackPlugin(): void {
    // Register a fallback plugin if auto-discovery fails
    this.registerPlugin({
      id: 'dnd-5e-2024',
      name: 'D&D 5e (2024)',
      description: 'Dungeons & Dragons 5th Edition (2024 Rules)',
      version: '1.0.0',
      author: 'Dungeon Lab Team',
      validateActorData: (_type: string, data: unknown) => {
        // Basic validation - just check that data is an object
        if (typeof data !== 'object' || data === null) {
          return { success: false, error: { message: 'Actor data must be an object' } };
        }
        
        // For now, accept any valid object
        return { success: true };
      },
      validateVTTDocumentData: (_type: string, data: unknown) => {
        // Basic validation - just check that data is an object
        if (typeof data !== 'object' || data === null) {
          return { success: false, error: { message: 'VTT document data must be an object' } };
        }
        
        // For now, accept any valid object
        return { success: true };
      }
    });
  }
  
  private registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }
  
  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }
  
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  validateGameSystemId(gameSystemId: string): boolean {
    return this.plugins.has(gameSystemId);
  }
  
  getGameSystemPlugin(gameSystemId: string): Plugin | undefined {
    return this.getPlugin(gameSystemId);
  }
}

export const pluginRegistry = new ServerPluginRegistry();