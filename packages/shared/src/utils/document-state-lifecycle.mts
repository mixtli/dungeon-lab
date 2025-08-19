/**
 * Document State Lifecycle Utilities
 * 
 * Generic utilities for plugin-extensible document state lifecycle management.
 * These functions provide single-patch atomic resets for state sections.
 */

import type { JsonPatchOperation } from '../types/index.mjs';
import type { PluginStateLifecycle, StateResetEvent } from '../types/document-state.mjs';

/**
 * Registry for plugin state lifecycle definitions
 */
const pluginStateLifecycles = new Map<string, PluginStateLifecycle>();

/**
 * Register plugin state lifecycle definition
 * 
 * @param lifecycle - Plugin's state lifecycle configuration
 */
export function registerPluginStateLifecycle(lifecycle: PluginStateLifecycle): void {
  pluginStateLifecycles.set(lifecycle.pluginId, lifecycle);
  
  console.log(`[StateLifecycle] Registered lifecycle for plugin: ${lifecycle.pluginId}`, {
    turnReset: lifecycle.turnReset ? Object.keys(lifecycle.turnReset) : [],
    sessionReset: lifecycle.sessionReset ? Object.keys(lifecycle.sessionReset) : [],
    encounterReset: lifecycle.encounterReset ? Object.keys(lifecycle.encounterReset) : []
  });
}

/**
 * Unregister plugin state lifecycle definition
 * 
 * @param pluginId - Plugin ID to unregister
 */
export function unregisterPluginStateLifecycle(pluginId: string): void {
  if (pluginStateLifecycles.delete(pluginId)) {
    console.log(`[StateLifecycle] Unregistered lifecycle for plugin: ${pluginId}`);
  }
}

/**
 * Get all plugin state lifecycles that have definitions for a specific event
 * 
 * @param event - State reset event type
 * @returns Array of plugin lifecycle definitions that handle this event
 */
export function getPluginStateResets(event: StateResetEvent): PluginStateLifecycle[] {
  const lifecycles: PluginStateLifecycle[] = [];
  
  for (const lifecycle of pluginStateLifecycles.values()) {
    const hasEventReset = 
      (event === 'turn' && lifecycle.turnReset) ||
      (event === 'session' && lifecycle.sessionReset) ||
      (event === 'encounter' && lifecycle.encounterReset);
      
    if (hasEventReset) {
      lifecycles.push(lifecycle);
    }
  }
  
  return lifecycles;
}

/**
 * Generic utility for resetting any state section with single patch operation
 * 
 * @param documentId - ID of document to update
 * @param sectionPath - Path within document.state to reset (e.g., 'turnState', 'combat.actions')
 * @param defaultValue - Value to set the section to
 * @returns Single JSON patch operation
 */
export function resetStateSection(
  documentId: string,
  sectionPath: string,
  defaultValue: unknown
): JsonPatchOperation[] {
  return [{
    op: 'replace',
    path: `/documents/${documentId}/state/${sectionPath}`,
    value: defaultValue
  }];
}

/**
 * Reset all state sections for a specific plugin and document
 * 
 * @param documentId - ID of document to reset
 * @param pluginId - Plugin ID that defines the state structure
 * @param stateDefinition - State sections to reset with their default values
 * @returns Array of JSON patch operations
 */
export function resetPluginState(
  documentId: string,
  pluginId: string,
  stateDefinition: Record<string, unknown>
): JsonPatchOperation[] {
  const patches: JsonPatchOperation[] = [];
  
  // Reset each section defined by the plugin
  for (const [sectionName, defaultValue] of Object.entries(stateDefinition)) {
    patches.push({
      op: 'replace',
      path: `/documents/${documentId}/state/${sectionName}`,
      value: defaultValue
    });
  }
  
  console.log(`[StateLifecycle] Generated ${patches.length} reset patches for plugin ${pluginId} on document ${documentId}`);
  
  return patches;
}

/**
 * Generate state reset patches for all documents and all plugins for a specific lifecycle event
 * 
 * @param documentIds - Array of document IDs to reset
 * @param event - Lifecycle event (turn, session, encounter)
 * @returns Array of JSON patch operations for all affected documents
 */
export function generateLifecycleResetPatches(
  documentIds: string[],
  event: StateResetEvent
): JsonPatchOperation[] {
  const patches: JsonPatchOperation[] = [];
  const lifecycles = getPluginStateResets(event);
  
  if (lifecycles.length === 0) {
    console.log(`[StateLifecycle] No plugins registered for ${event} reset`);
    return patches;
  }
  
  for (const documentId of documentIds) {
    for (const lifecycle of lifecycles) {
      let stateDefinition: Record<string, unknown> | undefined;
      
      switch (event) {
        case 'turn':
          stateDefinition = lifecycle.turnReset;
          break;
        case 'session':
          stateDefinition = lifecycle.sessionReset;
          break;
        case 'encounter':
          stateDefinition = lifecycle.encounterReset;
          break;
      }
      
      if (stateDefinition) {
        patches.push(...resetPluginState(documentId, lifecycle.pluginId, stateDefinition));
      }
    }
  }
  
  console.log(`[StateLifecycle] Generated ${patches.length} total reset patches for ${event} event across ${documentIds.length} documents`);
  
  return patches;
}

/**
 * Convenience functions for standard lifecycle sections
 */

/**
 * Reset turnState section for a document
 */
export function resetTurnState(documentId: string, defaultValue: unknown = null): JsonPatchOperation[] {
  return resetStateSection(documentId, 'turnState', defaultValue);
}

/**
 * Reset sessionState section for a document  
 */
export function resetSessionState(documentId: string, defaultValue: unknown = null): JsonPatchOperation[] {
  return resetStateSection(documentId, 'sessionState', defaultValue);
}

/**
 * Reset encounterState section for a document
 */
export function resetEncounterState(documentId: string, defaultValue: unknown = null): JsonPatchOperation[] {
  return resetStateSection(documentId, 'encounterState', defaultValue);
}

/**
 * Reset persistentState section for a document (rarely used - persistent should survive resets)
 */
export function resetPersistentState(documentId: string, defaultValue: unknown = null): JsonPatchOperation[] {
  return resetStateSection(documentId, 'persistentState', defaultValue);
}

/**
 * Reset multiple standard sections at once for a document
 */
export function resetStandardSections(
  documentId: string,
  sections: {
    turnState?: unknown;
    sessionState?: unknown;
    encounterState?: unknown;
    persistentState?: unknown;
  }
): JsonPatchOperation[] {
  const patches: JsonPatchOperation[] = [];
  
  if ('turnState' in sections) {
    patches.push(...resetTurnState(documentId, sections.turnState));
  }
  if ('sessionState' in sections) {
    patches.push(...resetSessionState(documentId, sections.sessionState));
  }
  if ('encounterState' in sections) {
    patches.push(...resetEncounterState(documentId, sections.encounterState));
  }
  if ('persistentState' in sections) {
    patches.push(...resetPersistentState(documentId, sections.persistentState));
  }
  
  return patches;
}

/**
 * Clear all registered plugin state lifecycles (for testing)
 */
export function clearAllPluginStateLifecycles(): void {
  pluginStateLifecycles.clear();
  console.log('[StateLifecycle] Cleared all registered plugin state lifecycles');
}