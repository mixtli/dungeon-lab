/**
 * Multi-Handler Registry System
 * 
 * Manages registration and execution of multiple handlers per action type.
 * Supports priority-based execution ordering with core handlers first.
 */

import type { ActionHandler } from './action-handler.interface.mjs';

/**
 * Registry storage: action type -> array of handlers (sorted by priority)
 */
const actionHandlers: Record<string, ActionHandler[]> = {};

/**
 * Register a new action handler
 * Handlers are automatically sorted by priority (lower numbers first)
 */
export function registerAction(actionType: string, handler: ActionHandler): void {
  if (!actionHandlers[actionType]) {
    actionHandlers[actionType] = [];
  }
  
  actionHandlers[actionType].push(handler);
  
  // Sort by priority (core handlers = 0, plugins = 100+)
  actionHandlers[actionType].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  
  console.log(`[MultiHandlerRegistry] Registered handler for '${actionType}'`, {
    pluginId: handler.pluginId || 'core',
    priority: handler.priority || 0,
    totalHandlers: actionHandlers[actionType].length
  });
}

/**
 * Get all handlers for an action type (sorted by priority)
 */
export function getHandlers(actionType: string): ActionHandler[] {
  return actionHandlers[actionType] || [];
}

/**
 * Unregister a specific handler
 */
export function unregisterAction(actionType: string, pluginId: string): void {
  if (!actionHandlers[actionType]) return;
  
  const beforeCount = actionHandlers[actionType].length;
  actionHandlers[actionType] = actionHandlers[actionType].filter(
    handler => handler.pluginId !== pluginId
  );
  const afterCount = actionHandlers[actionType].length;
  
  console.log(`[MultiHandlerRegistry] Unregistered handler for '${actionType}'`, {
    pluginId,
    removedCount: beforeCount - afterCount
  });
  
  // Clean up empty arrays
  if (actionHandlers[actionType].length === 0) {
    delete actionHandlers[actionType];
  }
}

/**
 * Unregister all handlers for a plugin
 */
export function unregisterPluginActions(pluginId: string): void {
  let totalRemoved = 0;
  
  for (const actionType in actionHandlers) {
    const beforeCount = actionHandlers[actionType].length;
    actionHandlers[actionType] = actionHandlers[actionType].filter(
      handler => handler.pluginId !== pluginId
    );
    const afterCount = actionHandlers[actionType].length;
    totalRemoved += beforeCount - afterCount;
    
    // Clean up empty arrays
    if (actionHandlers[actionType].length === 0) {
      delete actionHandlers[actionType];
    }
  }
  
  console.log(`[MultiHandlerRegistry] Unregistered all handlers for plugin '${pluginId}'`, {
    totalRemoved
  });
}

/**
 * Check if any handler for an action requires manual approval
 */
export function requiresManualApproval(actionType: string): boolean {
  const handlers = getHandlers(actionType);
  return handlers.some(handler => handler.requiresManualApproval === true);
}

/**
 * Check if an action is GM-only
 */
export function isGmOnly(actionType: string): boolean {
  const handlers = getHandlers(actionType);
  return handlers.some(handler => handler.gmOnly === true);
}

/**
 * Generate approval message for an action request
 */
export function generateApprovalMessage(actionType: string, request: any): string {
  const handlers = getHandlers(actionType);
  
  // Use the first handler that has an approval message
  for (const handler of handlers) {
    if (handler.approvalMessage) {
      return handler.approvalMessage(request);
    }
  }
  
  // Fallback message
  return `wants to perform action: ${actionType}`;
}

/**
 * Register action handler for a plugin (called by PluginContext implementation)
 */
export function registerPluginActionHandler(pluginId: string, actionType: string, handler: Omit<ActionHandler, 'pluginId'>): void {
  registerAction(actionType, { ...handler, pluginId });
}

/**
 * Unregister action handler for a plugin (called by PluginContext implementation)
 */
export function unregisterPluginActionHandler(pluginId: string, actionType: string): void {
  unregisterAction(actionType, pluginId);
}

/**
 * Unregister all action handlers for a plugin (called by PluginContext implementation)
 */
export function unregisterAllPluginActionHandlers(pluginId: string): void {
  unregisterPluginActions(pluginId);
}

/**
 * Initialize core action handlers during app startup
 */
export function initializeCoreActionHandlers(): void {
  console.log('[MultiHandlerRegistry] Initializing core action handlers...');
  
  // Core handlers will be registered here after we convert the existing handlers
  // This function will be called during app startup, before any game sessions start
}

/**
 * Clear all registered handlers (for testing only)
 */
export function clearAllHandlers(): void {
  for (const actionType in actionHandlers) {
    delete actionHandlers[actionType];
  }
}

/**
 * Get registration statistics for debugging
 */
export function getRegistrationStats(): Record<string, { totalHandlers: number; plugins: string[] }> {
  const stats: Record<string, { totalHandlers: number; plugins: string[] }> = {};
  
  for (const [actionType, handlers] of Object.entries(actionHandlers)) {
    stats[actionType] = {
      totalHandlers: handlers.length,
      plugins: handlers.map(h => h.pluginId || 'core')
    };
  }
  
  return stats;
}