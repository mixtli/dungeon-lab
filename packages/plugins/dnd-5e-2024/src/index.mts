/**
 * D&D 5th Edition (2024) Plugin - Simplified Version
 * 
 * This plugin implements the basic D&D 5e 2024 character sheet using the new
 * simplified plugin architecture with manifest-based configuration.
 */

import { BaseGameSystemPlugin, ValidationResult, PluginContext } from '@dungeon-lab/shared/types/plugin.mjs';
import { validateCharacterData } from './character-validation.mjs';

/**
 * D&D 5th Edition (2024) Plugin Implementation - Using Base Class
 */
export class DnD5e2024Plugin extends BaseGameSystemPlugin {
  
  
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
   * Plugin initialization
   */
  async onLoad(context?: PluginContext): Promise<void> {
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