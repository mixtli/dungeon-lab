/**
 * Plugin Asset Loader Service
 * 
 * This service handles loading UI assets for plugins, including templates, styles, and scripts.
 * It converts file paths from the plugin's configuration into loaded assets that can be used
 * by the application.
 */

import { IWebPlugin, IPluginScript } from '@dungeon-lab/shared/types/plugin.mjs';

/**
 * Load UI assets for a plugin context
 * @param plugin The web plugin
 * @param context The UI context (e.g., "characterCreation")
 * @returns A promise that resolves to true if assets were loaded successfully, false otherwise
 */
export async function loadPluginUIAssets(
  plugin: IWebPlugin,
  context: string
): Promise<boolean> {
  try {
    // Get the asset paths from the plugin
    const assetPaths = plugin.getUIAssetPaths(context);
    if (!assetPaths) {
      console.warn(`Plugin ${plugin.config.id} does not have UI assets for context: ${context}`);
      return false;
    }

    // Log the asset paths we're loading
    console.debug(`Loading UI assets for plugin ${plugin.config.id}, context ${context}:`, assetPaths);

    // Prepare full paths with plugin ID prefix
    const templatePath = `@plugins/${plugin.config.id}/${assetPaths.template}`;
    const stylesPath = `@plugins/${plugin.config.id}/${assetPaths.styles}`;
    const scriptPath = `@plugins/${plugin.config.id}/${assetPaths.script}`;

    // Load assets in parallel
    const [template, styles, scriptModule] = await Promise.all([
      loadRawFile(templatePath),
      loadRawFile(stylesPath),
      import(/* @vite-ignore */ scriptPath) // Import script as ES module
    ]);

    // Validate the script module
    if (!scriptModule || typeof scriptModule.init !== 'function') {
      throw new Error(`Script module for ${context} does not export an 'init' function`);
    }

    // Load partials if defined
    const partials: Record<string, string> = {};
    if (assetPaths.partials) {
      const partialEntries = Object.entries(assetPaths.partials);
      console.debug(`Loading ${partialEntries.length} partials for ${context}`);
      
      // Load all partials in parallel
      const loadedPartials = await Promise.all(
        partialEntries.map(async ([name, path]) => {
          const fullPath = `@plugins/${plugin.config.id}/${path}`;
          const content = await loadRawFile(fullPath);
          return { name, content };
        })
      );
      
      // Add all loaded partials to the partials object
      for (const { name, content } of loadedPartials) {
        partials[name] = content;
      }
    }
    
    // Load assets if defined
    const assetUrls: Record<string, string> = {};
    if (assetPaths.assets) {
      // In a real implementation, we would load all assets and generate URLs
      // For now, we'll just log that we would load them
      console.debug(`Asset loading not fully implemented yet. Would load assets from: ${assetPaths.assets.baseDir}`);
      
      // In a complete implementation, we would:
      // 1. Resolve glob patterns to get all matching files
      // 2. Load each file and generate a URL
      // 3. Store the URL in the assetUrls object
    }

    // Register the loaded assets with the plugin
    plugin.registerUIAssets(context, {
      template,
      styles,
      script: scriptModule as IPluginScript,
      partials: Object.keys(partials).length > 0 ? partials : undefined,
      assetUrls: Object.keys(assetUrls).length > 0 ? assetUrls : undefined
    });

    console.log(`Successfully loaded UI assets for plugin ${plugin.config.id}, context ${context}`);
    return true;
  } catch (error) {
    console.error(`Failed to load UI assets for plugin ${plugin.config.id}, context ${context}:`, error);
    return false;
  }
}

/**
 * Load a file as raw text
 * @param path The path to the file
 * @returns A promise that resolves to the file contents as a string
 */
async function loadRawFile(path: string): Promise<string> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load file: ${path} (${response.status} ${response.statusText})`);
    }
    return await response.text();
  } catch (fetchError) {
    console.debug(`Fetch failed, trying import for: ${path}`);
    try {
      // Fall back to Vite's import with ?raw suffix
      const module = await import(/* @vite-ignore */ `${path}?raw`);
      return module.default;
    } catch (importError) {
      console.error(`Failed to load file using both fetch and import: ${path}`, importError);
      throw importError;
    }
  }
} 