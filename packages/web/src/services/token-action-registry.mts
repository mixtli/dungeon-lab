/**
 * Token Action Registry Service
 * 
 * Centralized registry for token context menu actions from all plugins.
 * This service maintains a global list of all registered token actions
 * and provides them to the TokenContextMenu component.
 */

import type { TokenContextAction } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

export class TokenActionRegistryService {
  private actions = new Map<string, TokenContextAction>();
  
  /**
   * Register a token action
   * @param action Token action to register
   */
  registerAction(action: TokenContextAction): void {
    this.actions.set(action.id, action);
    console.log(`[TokenActionRegistry] Registered action: ${action.id} (${action.label})`);
  }
  
  /**
   * Unregister a token action
   * @param actionId ID of action to unregister
   */
  unregisterAction(actionId: string): void {
    const existed = this.actions.delete(actionId);
    if (existed) {
      console.log(`[TokenActionRegistry] Unregistered action: ${actionId}`);
    }
  }
  
  /**
   * Get all registered token actions, sorted by priority and group
   * @returns Array of token actions sorted by priority (lower first) then by label
   */
  getAllActions(): TokenContextAction[] {
    const actions = Array.from(this.actions.values());
    
    // Sort by priority (lower first), then by groupLabel, then by label
    return actions.sort((a, b) => {
      // Primary sort by priority
      const priorityA = a.priority ?? 100;
      const priorityB = b.priority ?? 100;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Secondary sort by group label
      const groupA = a.groupLabel ?? '';
      const groupB = b.groupLabel ?? '';
      if (groupA !== groupB) {
        return groupA.localeCompare(groupB);
      }
      
      // Tertiary sort by label
      return a.label.localeCompare(b.label);
    });
  }
  
  /**
   * Get actions grouped by groupLabel
   * @returns Map of group labels to arrays of actions
   */
  getActionsByGroup(): Map<string, TokenContextAction[]> {
    const groups = new Map<string, TokenContextAction[]>();
    const actions = this.getAllActions();
    
    for (const action of actions) {
      const groupLabel = action.groupLabel ?? 'Other Actions';
      
      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, []);
      }
      
      groups.get(groupLabel)!.push(action);
    }
    
    return groups;
  }
  
  /**
   * Clear all registered actions (for testing/cleanup)
   */
  clear(): void {
    this.actions.clear();
    console.log('[TokenActionRegistry] Cleared all actions');
  }
  
  /**
   * Get count of registered actions
   */
  getActionCount(): number {
    return this.actions.size;
  }
}

// Export singleton instance
export const tokenActionRegistry = new TokenActionRegistryService();