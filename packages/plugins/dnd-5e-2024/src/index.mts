/**
 * D&D 5th Edition (2024) Plugin - Simplified Version
 * 
 * This plugin implements the basic D&D 5e 2024 character sheet using the new
 * simplified plugin architecture with manifest-based configuration.
 */

import { BaseGameSystemPlugin, ValidationResult, PluginContext } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import { validateCharacterData } from './character-validation.mjs';
import { DnD5eTurnManager } from './turn-manager.mjs';

/**
 * D&D 5th Edition (2024) Plugin Implementation - Using Base Class
 */
export class DnD5e2024Plugin extends BaseGameSystemPlugin {
  
  // Add turn manager instance (lazy initialization)
  private _turnManager: DnD5eTurnManager | null = null;
  
  get turnManager(): DnD5eTurnManager {
    if (!this._turnManager) {
      this._turnManager = new DnD5eTurnManager();
    }
    return this._turnManager;
  }
  
  /**
   * Validate data against game system rules
   */
  validate(type: string, data: unknown): ValidationResult {
    console.log(`[${this.manifest.id}] Validating ${type} data`);
    
    switch (type) {
      case 'character':
        return this.validateCharacterData(data);
      default:
        console.warn(`[${this.manifest.id}] Unknown validation type: ${type}`);
        return {
          success: false,
          errors: [`Unknown validation type: ${type}`]
        };
    }
  }
  
  /**
   * Get token grid size for a document (D&D creature size system)
   */
  getTokenGridSize(document: unknown): number {
    try {
      // Check if document has D&D size data
      if (document && typeof document === 'object' && 'pluginData' in document) {
        const pluginData = (document as { pluginData?: Record<string, unknown> }).pluginData;
        
        if (pluginData && typeof pluginData.size === 'string') {
          const dndSize = pluginData.size.toLowerCase();
          
          // Map D&D creature sizes to grid cell multipliers
          switch (dndSize) {
            case 'tiny':
              return 0.5; // Half a grid cell
            case 'small':
            case 'medium':
              return 1; // One grid cell (1x1)
            case 'large':
              return 2; // Four grid cells (2x2)
            case 'huge':
              return 3; // Nine grid cells (3x3)
            case 'gargantuan':
              return 4; // Sixteen grid cells (4x4)
            default:
              console.warn(`[${this.manifest.id}] Unknown D&D size: ${dndSize}, defaulting to medium`);
              return 1;
          }
        }
      }
      
      // Default to medium size (1x1 grid cells)
      return 1;
    } catch (error) {
      console.error(`[${this.manifest.id}] Error getting token grid size:`, error);
      return 1;
    }
  }
  
  /**
   * Plugin initialization
   */
  async onLoad(context?: PluginContext): Promise<void> {
    await super.onLoad(context);
    console.log(`[${this.manifest.id}] Loading D&D 5e 2024 Plugin v${this.manifest.version}`);
    if (context) {
      console.log(`[${this.manifest.id}] Plugin context provided - API access available`);
    }
    console.log(`[${this.manifest.id}] Plugin loaded successfully`);
  }
  
  /**
   * Plugin cleanup
   */
  async onUnload(): Promise<void> {
    console.log(`[${this.manifest.id}] Unloading D&D 5e 2024 Plugin`);
  }
  
  /**
   * Legacy validation method for backward compatibility
   * @deprecated Use validate('character', data) instead
   */
  validateCharacterData(data: unknown): ValidationResult {
    console.log(`[${this.manifest.id}] 🔍 PLUGIN VALIDATION METHOD CALLED`);
    console.log(`[${this.manifest.id}] Data structure:`, {
      hasSpecies: !!(data && typeof data === 'object' && 'species' in data),
      speciesFormat: data && typeof data === 'object' && 'species' in data ? (data as Record<string, unknown>).species : undefined,
      hasBackground: !!(data && typeof data === 'object' && 'background' in data),
      backgroundFormat: data && typeof data === 'object' && 'background' in data ? (data as Record<string, unknown>).background : undefined
    });
    
    const result = validateCharacterData(data);
    console.log(`[${this.manifest.id}] 🧪 Validation result:`, result);
    
    return result;
  }
}

// Export only the plugin class as default
// The discovery service expects nothing else
export default DnD5e2024Plugin;