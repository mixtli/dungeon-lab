/**
 * Vite Plugin: Plugin Import Map Generator
 * 
 * This plugin generates and injects import maps for dynamic plugin loading.
 * Import maps allow us to map module specifiers to URLs, enabling clean module imports
 * without complex path resolution.
 * 
 * In development:
 * - Maps '@plugins/plugin-name' to the source files
 * - Example: '@plugins/test-dice-roller' -> '/plugins/test-dice-roller/index.mjs'
 * 
 * In production:
 * - Maps to the built files
 * - Example: '@plugins/test-dice-roller' -> '/plugins/test-dice-roller/index.js'
 */

import { Plugin } from 'vite';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Set up paths for plugin discovery
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLUGINS_DIR = join(__dirname, '../../../plugins');

// Type definition for plugin configuration files
interface PluginConfig {
  id: string;
  name: string;
  enabled?: boolean;
  clientEntryPoint: string;
}

/**
 * Reads and parses all plugin configuration files from the plugins directory.
 * Each plugin should have a config.json file containing metadata about the plugin.
 * 
 * @returns Array of plugin configurations
 */
async function readPluginConfigs(): Promise<PluginConfig[]> {
  try {
    const entries = await readdir(PLUGINS_DIR);
    const configs: PluginConfig[] = [];

    for (const entry of entries) {
      try {
        const configPath = join(PLUGINS_DIR, entry, 'config.json');
        const configContent = await readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        // Add the ID to the config if not present
        if (!config.id) {
          config.id = entry;
        }
        
        // Skip plugins without client entry points
        if (!config.clientEntryPoint) {
          console.log(`[Plugin Import Map] Skipping ${entry}: no client entry point`);
          continue;
        }
        
        configs.push(config);
      } catch (error) {
        console.warn(`[Plugin Import Map] Failed to read plugin config for ${entry}:`, error);
      }
    }

    console.log('[Plugin Import Map] Found plugin configs:', configs);
    return configs;
  } catch (error) {
    console.error('[Plugin Import Map] Error reading plugin directory:', error);
    return [];
  }
}

/**
 * Generates the import map for development mode.
 * Maps plugin identifiers to their source files for development.
 * 
 * @returns Import map object with module specifier mappings
 */
async function generateDevImportMap(): Promise<object> {
  const configs = await readPluginConfigs();
  const imports: Record<string, string> = {};

  for (const config of configs) {
    if (config.enabled !== false) {  // treat undefined as enabled
      // Map directly to the source TypeScript file
      // The paths are relative to where the plugins directory is
      // This relies on Vite's fs.allow configuration to serve these files
      const pluginPath = `/@fs${PLUGINS_DIR}/${config.id}/${config.clientEntryPoint}`;
      
      // Map the base plugin name to the entry point
      imports[`@plugins/${config.id}`] = pluginPath;
      
      console.log(`[Import Map] 🔗 Mapping @plugins/${config.id} -> ${pluginPath}`);
    }
  }

  console.log('[Import Map] 📊 Generated dev import map:', imports);
  return { imports };
}

/**
 * Generates the import map for production mode.
 * Maps plugin identifiers to their built files.
 * 
 * @returns Import map object with module specifier mappings
 */
async function generateProdImportMap(): Promise<object> {
  const configs = await readPluginConfigs();
  const imports: Record<string, string> = {};

  for (const config of configs) {
    if (config.enabled !== false) {  // treat undefined as enabled
      // In production, we'll output to a predictable location
      imports[`@plugins/${config.id}`] = `/plugins/${config.id}/index.js`;
      console.log(`[Import Map] Mapping @plugins/${config.id} -> /plugins/${config.id}/index.js`);
    }
  }

  console.log('[Import Map] Generated prod import map:', imports);
  return { imports };
}

export function pluginImportMap(): Plugin {
  let importMap: object | null = null;
  
  return {
    name: 'vite-plugin-plugin-import-map',
    
    async buildStart() {
      console.log('[Import Map] Build starting...');
      try {
        // Generate the import map immediately
        importMap = await generateDevImportMap();
        console.log('[Import Map] Initial import map generated');
      } catch (error) {
        console.error('[Import Map] Error during buildStart:', error);
      }
    },

    transformIndexHtml: {
      enforce: 'pre',
      async handler(html) {
        console.log('[Import Map] 📝 Transforming HTML...');
        
        try {
          // Get or generate the import map
          let currentImportMap = importMap;
          
          if (!currentImportMap) {
            currentImportMap = await generateDevImportMap();
          }
          
          console.log('[Import Map] ✅ Using existing import map:', JSON.stringify(currentImportMap, null, 2));
          
          // Inject the import map into the HTML
          const importMapTag = `<script type="importmap">${JSON.stringify(currentImportMap)}</script>`;
          
          // Insert after the opening <head> tag
          const htmlWithImportMap = html.replace(
            /<head>/i, 
            `<head>\n  ${importMapTag}`
          );
          
          console.log('[Import Map] ✅ Import map injected into HTML');
          
          return htmlWithImportMap;
        } catch (error) {
          console.error('[Import Map] ❌ Error injecting import map:', error);
          return html;
        }
      }
    }
  };
} 