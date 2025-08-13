import type { Component } from 'vue';
import type { PluginManifest } from '@dungeon-lab/shared/schemas/plugin-manifest.schema.mjs';
import type { PluginContext } from './plugin-context.mjs';
import type { BaseTurnManagerPlugin } from '../base/base-turn-manager.mjs';

// Export the base class for plugins to extend
export { BaseGameSystemPlugin } from '../base/base-plugin.mjs';

// Re-export types for convenience
export type { PluginContext } from './plugin-context.mjs';
export type { PluginManifest } from '@dungeon-lab/shared/schemas/plugin-manifest.schema.mjs';

/**
 * Simplified Plugin Architecture
 * 
 * This file contains the clean, minimal plugin interface focused on client-side
 * Vue component needs. It removes all the legacy server-side API cruft from
 * the original plugin.mts file.
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
 * Game system specific plugin interface
 * 
 * This is the core interface that all game system plugins must implement.
 * It focuses on the essential functionality: providing Vue components and
 * validating game system data.
 * 
 * Design Principles:
 * - All plugin metadata stored in manifest property
 * - Plugins provide standard components via getComponent()
 * - Plugins validate any data type via validate() method  
 * - Main app never knows about specific game system details
 * - Component types are flexible strings, not hard-coded enums
 * - Validation types are flexible strings, not hard-coded enums
 */
export interface GameSystemPlugin {
  /** Plugin manifest containing all metadata and capabilities */
  readonly manifest: PluginManifest;
  
  /**
   * Get a Vue component by type using async loading
   * 
   * Standard component types (documented conventions):
   * - 'character-sheet': Display/edit character data
   * - 'character-creator': Multi-step character creation wizard
   * 
   * Plugins can define additional component types beyond these standards.
   * 
   * @param type Component type identifier
   * @returns Promise resolving to Vue component or null if not supported
   */
  getComponent(type: string): Promise<Component | null>;
  
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
   * @param context Optional plugin context providing API access, store, and events
   */
  onLoad(context?: PluginContext): Promise<void>;
  
  /**
   * Called when the plugin is unloaded from the system
   * Simple lifecycle method for plugin cleanup
   */
  onUnload(): Promise<void>;
  
  /**
   * Get token grid size for a document
   * 
   * Returns the number of grid cells that the token should occupy when placed on the map.
   * This is a numeric value representing the side length of the square area the token occupies.
   * 
   * Examples:
   * - 0.5 = tiny creature (half a grid cell)
   * - 1 = small/medium creature (1x1 grid cells)
   * - 2 = large creature (2x2 grid cells)
   * - 3 = huge creature (3x3 grid cells)
   * - 4 = gargantuan creature (4x4 grid cells)
   * 
   * @param document Document to get token size for
   * @returns Grid size multiplier (default: 1 for medium size)
   */
  getTokenGridSize(document: unknown): number;
  
  /**
   * Turn manager for game-specific turn order and action permissions
   * Optional - plugins can provide turn manager implementations
   */
  turnManager?: BaseTurnManagerPlugin;
  
  /**
   * @deprecated Use validate('character', data) instead
   * Legacy method for backward compatibility during transition
   */
  validateCharacterData?(data: unknown): ValidationResult;
}

/**
 * Plugin Implementation Pattern
 * 
 * Plugins should implement the GameSystemPlugin interface like this:
 * 
 * ```typescript
 * export class MyGamePlugin implements GameSystemPlugin {
 *   readonly manifest: PluginManifest;
 *   
 *   constructor() {
 *     // Hard-coded manifest for now (will be dynamic later)
 *     this.manifest = {
 *       id: 'my-game-system',
 *       name: 'My Game System',
 *       version: '1.0.0',
 *       gameSystem: 'my-game',
 *       characterTypes: ['character', 'npc'],
 *       itemTypes: ['weapon', 'armor'],
 *       entryPoint: './dist/index.mjs'
 *     };
 *   }
 *   
 *   // Access manifest properties as needed:
 *   // this.manifest.id
 *   // this.manifest.characterTypes
 *   // this.manifest.gameSystem
 *   
 *   async onLoad(): Promise<void> { ... }
 *   getComponent(type: string): Component | null { ... }
 *   validate(type: string, data: unknown): ValidationResult { ... }
 * }
 * ```
 */

/**
 * Standard component type conventions (documentation only)
 * 
 * These are the component types that the main application expects plugins
 * to provide. Plugins should implement these to integrate with the main app.
 * 
 * Additional component types can be defined by plugins as needed.
 */
export const STANDARD_COMPONENT_TYPES = {
  CHARACTER_SHEET: 'character-sheet',
  CHARACTER_CREATOR: 'character-creator',
} as const;

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