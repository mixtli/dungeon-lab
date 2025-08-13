import type { Component } from 'vue';
import type { PluginManifest } from '@dungeon-lab/shared/schemas/plugin-manifest.schema.mjs';
import type { PluginContext } from './plugin-context.mjs';
import type { BaseTurnManagerPlugin } from '../base/base-turn-manager.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

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
  getTokenGridSize(document: BaseDocument): number;
  
  /**
   * Get movement limit for a document in grid cells per turn
   * 
   * Returns the number of grid cells that the character/actor can move in a single turn.
   * This should implement game-specific movement calculation rules.
   * 
   * Examples for D&D 5e:
   * - 30ft speed = 6 cells (30 ÷ 5 feet per cell)
   * - 25ft speed = 5 cells  
   * - 40ft speed = 8 cells
   * 
   * @param document Document to get movement limit for
   * @returns Number of grid cells that can be moved per turn
   */
  getMovementLimit(document: BaseDocument): number;
  
  /**
   * Get initial turn state data for a document
   * 
   * Returns plugin-specific data that should be tracked during the participant's turn.
   * This data is ephemeral and resets each turn.
   * 
   * Examples for D&D 5e:
   * - Action economy state (action used, bonus action used, reaction used)
   * - Legendary action tracking
   * - Spell slot usage tracking
   * 
   * @param document Document to get initial turn state for
   * @returns Plugin-specific turn state data
   */
  getInitialTurnState?(document: BaseDocument): Record<string, unknown>;
  
  /**
   * Check if a resource can be used by a document
   * 
   * Validates whether the participant can use a specific amount of a resource
   * based on game-specific rules and current turn state.
   * 
   * @param document Document attempting to use the resource
   * @param resourceId Identifier for the resource type (e.g., 'action', 'spell-slot-1')
   * @param amount Amount of resource to use
   * @param currentTurnState Current plugin-specific turn state
   * @returns Whether the resource usage is allowed
   */
  canUseResource?(document: BaseDocument, resourceId: string, amount: number, currentTurnState: Record<string, unknown>): boolean;
  
  /**
   * Use a resource and update turn state
   * 
   * Processes the resource usage and returns updated plugin-specific turn state.
   * This method should only be called after canUseResource returns true.
   * 
   * @param document Document using the resource
   * @param resourceId Identifier for the resource type
   * @param amount Amount of resource to use
   * @param currentTurnState Current plugin-specific turn state
   * @returns Updated plugin-specific turn state
   */
  useResource?(document: BaseDocument, resourceId: string, amount: number, currentTurnState: Record<string, unknown>): Record<string, unknown>;
  
  /**
   * Reset turn state at start of new turn
   * 
   * Resets plugin-specific turn state for a new turn. Called when a participant's
   * turn begins to reset per-turn resources.
   * 
   * @param document Document whose turn is starting
   * @param currentTurnState Current plugin-specific turn state
   * @returns Reset plugin-specific turn state
   */
  resetTurnState?(document: BaseDocument, currentTurnState: Record<string, unknown>): Record<string, unknown>;
  
  /**
   * Turn manager for game-specific turn order and action permissions
   * Optional - plugins can provide turn manager implementations
   */
  turnManager?: BaseTurnManagerPlugin;
  
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
  CHARACTER_CARD_INFO: 'character-card-info',
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