/**
 * Plugin Token Service
 * 
 * Provides token-related functionality through the plugin system.
 * This service abstracts plugin interactions for token sizing and related features.
 */

import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import { pluginDiscoveryService } from './plugin-discovery.service.mjs';

export class PluginTokenService {
  /**
   * Get token grid size for a document using the appropriate plugin
   * 
   * @param document Document to get token size for
   * @returns Grid size multiplier (e.g., 1, 2, 3, 4) or 1 as default
   */
  async getTokenGridSize(document: BaseDocument): Promise<number> {
    try {
      // Get the plugin for this document's plugin ID
      const plugin = await pluginDiscoveryService.loadPluginModule(document.pluginId);
      
      if (plugin && typeof plugin.getTokenGridSize === 'function') {
        const gridSize = plugin.getTokenGridSize(document);
        
        // Validate the result
        if (typeof gridSize === 'number' && gridSize > 0) {
          return gridSize;
        }
        
        console.warn(`Invalid grid size returned by plugin ${document.pluginId}:`, gridSize);
      } else {
        console.warn(`Plugin ${document.pluginId} not found or doesn't support getTokenGridSize`);
      }
    } catch (error) {
      console.error('Error getting token grid size from plugin:', error);
    }
    
    // Default fallback to medium size (1x1)
    return 1;
  }
  
  /**
   * Check if a plugin supports token sizing
   * 
   * @param pluginId Plugin ID to check
   * @returns True if plugin supports getTokenGridSize method
   */
  async supportsTokenSizing(pluginId: string): Promise<boolean> {
    try {
      const plugin = await pluginDiscoveryService.loadPluginModule(pluginId);
      return !!(plugin && typeof plugin.getTokenGridSize === 'function');
    } catch (error) {
      console.error('Error checking plugin token sizing support:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pluginTokenService = new PluginTokenService();