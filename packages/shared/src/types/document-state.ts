/**
 * Document State Type Definitions
 * 
 * Generic infrastructure for plugin-extensible document state management.
 * Plugins define their own state structure - the actual document.state field 
 * is Record<string, unknown> for maximum flexibility.
 */

/**
 * Common lifecycle patterns that many game systems use:
 * 
 * - **Turn-scoped**: State that resets when a participant's turn advances
 *   (e.g., actions available, movement used, abilities triggered)
 * 
 * - **Session-scoped**: State that resets on long rest or session end  
 *   (e.g., daily/long rest abilities, resources that refresh over time)
 * 
 * - **Encounter-scoped**: State that resets when combat/encounter ends
 *   (e.g., temporary conditions, combat effects, encounter-specific buffs)
 * 
 * - **Persistent**: State that survives all resets
 *   (e.g., health, permanent modifications, persistent conditions)
 * 
 * Plugins can use these patterns, combine them, or create entirely different structures.
 */

/**
 * Standard document state structure 
 * 
 * The actual schema uses z.object().catchall() to provide type-safe access to standard fields
 * while allowing plugin extensions. All standard fields are present but may be undefined.
 */
export interface DocumentState {
  // Standard lifecycle state sections (always present, may be undefined)
  turnState?: unknown;
  sessionState?: unknown;
  encounterState?: unknown;
  persistentState?: unknown;
  // Plugin extensible - additional sections can be added via index signature
  [key: string]: unknown;
}

/**
 * Plugin state lifecycle registration for automatic resets
 * Defines what default values to set for each lifecycle event
 */
export interface PluginStateLifecycle {
  pluginId: string;
  // State sections to reset on turn advancement (can include standard or custom sections)
  turnReset?: Record<string, unknown>;
  // State sections to reset on long rest (can include standard or custom sections)
  sessionReset?: Record<string, unknown>;
  // State sections to reset when encounter ends (can include standard or custom sections)
  encounterReset?: Record<string, unknown>;
}

/**
 * State reset utility types
 */
export type StateResetEvent = 'turn' | 'session' | 'encounter';
export type StateResetDefinition = Record<string, unknown>;