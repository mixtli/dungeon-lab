import type { PluginManifest } from '../schemas/plugin-manifest.schema.mjs';
import type { PluginContextBase } from './plugin-context-base.mjs';

// Export the base class for plugins to extend
export { BaseGameSystemPluginBase } from '../base/base-plugin-base.mjs';

// Re-export types for convenience
export type { PluginContextBase } from './plugin-context-base.mjs';
export type { PluginManifest } from '../schemas/plugin-manifest.schema.mjs';

/**
 * Base Plugin Interface (Vue-free)
 * 
 * This file contains the core plugin interface without Vue dependencies.
 * Vue-specific versions are available in @dungeon-lab/shared-ui.
 */

/**
 * Validation result interface for plugin data validation
 */
export interface ValidationResult {
  success: boolean;
  data?: unknown;
  errors?: string[];
}

/**
 * Base game system plugin interface without Vue dependencies
 * 
 * This is used by server-side code and provides the core plugin functionality
 * without requiring Vue components.
 */
export interface GameSystemPluginBase {
  /** Plugin manifest containing all metadata and capabilities */
  readonly manifest: PluginManifest;
  
  /**
   * Validate data against game system rules
   * 
   * Standard validation types (documented conventions):
   * - 'character': Character/PC data validation
   * - 'background': Character background validation
   * - 'item': Equipment/inventory validation
   * - 'spell': Spell data validation
   * - 'feat': Feature/feat data validation
   * 
   * Plugins can define additional validation types beyond these standards.
   * 
   * @param type Type of data to validate
   * @param data Data to validate
   * @returns Validation result with success/failure and any errors
   */
  validate(type: string, data: unknown): ValidationResult;
  
  /**
   * Called when the plugin is loaded into the system
   * Simple lifecycle method for plugin initialization
   * 
   * @param context Optional plugin context providing API access and store
   */
  onLoad(context?: PluginContextBase): Promise<void>;
  
  /**
   * Called when the plugin is unloaded from the system
   * Simple lifecycle method for plugin cleanup
   */
  onUnload(): Promise<void>;
  
  /**
   * @deprecated Use validate('character', data) instead
   * Legacy method for backward compatibility during transition
   */
  validateCharacterData?(data: unknown): ValidationResult;
}

/**
 * Standard validation type conventions (documentation only)
 * 
 * These are the validation types that the main application may request
 * from plugins. Plugins should implement these for core game data types.
 * 
 * Additional validation types can be defined by plugins as needed.
 */
export const STANDARD_VALIDATION_TYPES = {
  CHARACTER: 'character',
  ITEM: 'item',
  ACTOR: 'actor',
  DOCUMENT: 'vttdocument'
} as const;