/**
 * D&D 5e Remove Condition Action Handler
 * 
 * Handles removing conditions from characters with D&D-specific logic:
 * - Condition removal validation
 * - Cascading condition removal (removing parent conditions)
 * - Duration expiration handling
 * - Recovery mechanics integration
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Conditions that automatically remove other conditions when removed
 */
const CONDITION_DEPENDENCIES: Record<string, string[]> = {
  'unconscious': ['prone', 'incapacitated'], // Removing unconscious also removes these
  'paralyzed': ['incapacitated'], // Removing paralyzed also removes incapacitated
  'petrified': ['incapacitated'], // Removing petrified also removes incapacitated
};

/**
 * Validate removing condition from character
 */
export function validateRemoveCondition(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult {
  console.log('[DnD5e] Validating remove condition:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as { 
    targetId?: string; 
    condition?: string;
    removeAll?: boolean; // Remove all instances of stackable conditions
  };
  const { targetId, condition } = params;
  
  if (!targetId || !condition) {
    return { valid: false, error: { code: 'INVALID_PARAMETERS', message: 'Missing target ID or condition' } };
  }

  // Find the target character/actor
  const target = gameState.documents[targetId];
  if (!target) {
    return { valid: false, error: { code: 'TARGET_NOT_FOUND', message: 'Target character not found' } };
  }

  // Check if target actually has the condition
  const currentConditions = (target.state?.conditions as string[]) || [];
  const conditionKey = condition.toLowerCase();
  
  const hasCondition = currentConditions.some(c => c.toLowerCase() === conditionKey);
  if (!hasCondition) {
    return {
      valid: false,
      error: { 
        code: 'CONDITION_NOT_PRESENT', 
        message: `${target.name} does not have condition: ${condition}` 
      }
    };
  }

  // Check if there are any restrictions on removing this condition
  // (For example, some conditions might require specific methods to remove)
  
  // For now, all conditions can be removed if present
  console.log('[DnD5e] Remove condition validation passed');
  return { valid: true };
}

/**
 * Execute removing condition from character
 */
export function executeRemoveCondition(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e] Executing remove condition');

  const params = request.parameters as { 
    targetId?: string; 
    condition?: string;
    removeAll?: boolean;
  };
  const { targetId, condition, removeAll = false } = params;
  
  if (!targetId || !condition) {
    console.warn('[DnD5e] Invalid parameters during remove condition execution');
    return;
  }

  // Find the target character/actor
  const target = draft.documents[targetId];
  if (!target) {
    console.warn('[DnD5e] Target not found during remove condition execution');
    return;
  }

  // Initialize state if needed
  if (!target.state) target.state = {};
  if (!target.state.conditions) target.state.conditions = [];

  const conditions = target.state.conditions as string[];
  const conditionKey = condition.toLowerCase();

  // Remove the condition(s)
  let removedCount = 0;
  if (removeAll) {
    // Remove all instances of this condition (for stackable conditions)
    const originalLength = conditions.length;
    target.state.conditions = conditions.filter(c => c.toLowerCase() !== conditionKey);
    removedCount = originalLength - (target.state.conditions as string[]).length;
  } else {
    // Remove only the first instance
    const conditionIndex = conditions.findIndex(c => c.toLowerCase() === conditionKey);
    if (conditionIndex !== -1) {
      conditions.splice(conditionIndex, 1);
      removedCount = 1;
    }
  }

  // Remove condition details if they exist
  if (target.state.conditionDetails) {
    const conditionDetails = target.state.conditionDetails as Record<string, any>;
    const keysToRemove = Object.keys(conditionDetails).filter(key => 
      conditionDetails[key].condition?.toLowerCase() === conditionKey
    );
    
    if (removeAll) {
      // Remove all instances
      for (const key of keysToRemove) {
        delete conditionDetails[key];
      }
    } else {
      // Remove only the oldest instance
      if (keysToRemove.length > 0) {
        const oldestKey = keysToRemove.reduce((oldest, current) => 
          conditionDetails[current].addedAt < conditionDetails[oldest].addedAt ? current : oldest
        );
        delete conditionDetails[oldestKey];
      }
    }
  }

  // Handle cascading condition removal
  const dependentConditions = CONDITION_DEPENDENCIES[conditionKey];
  if (dependentConditions && removedCount > 0) {
    const updatedConditions = target.state.conditions as string[];
    
    for (const dependentCondition of dependentConditions) {
      // Check if the dependent condition was only present due to the removed condition
      // For simplicity, we'll remove dependent conditions when the parent is removed
      const dependentIndex = updatedConditions.findIndex(c => 
        c.toLowerCase() === dependentCondition.toLowerCase()
      );
      
      if (dependentIndex !== -1) {
        updatedConditions.splice(dependentIndex, 1);
        console.log(`[DnD5e] Removed dependent condition: ${dependentCondition}`);
      }
    }
  }

  // Apply any recovery effects based on condition removal
  switch (conditionKey) {
    case 'paralyzed':
    case 'stunned':
    case 'unconscious':
      // These conditions prevent actions, so removing them doesn't restore actions
      // (actions reset on turn start anyway)
      break;
      
    case 'exhaustion':
      // Removing exhaustion might restore some capabilities
      // This would depend on the current exhaustion level
      break;
      
    case 'poisoned':
      // No immediate mechanical effect from removing poisoned
      break;
  }

  console.log('[DnD5e] Condition removed:', {
    targetName: target.name,
    condition,
    removedCount,
    removeAll,
    remainingConditions: (target.state.conditions as string[]).length
  });
}

/**
 * D&D Remove Condition Action Handler
 * Pure plugin action for D&D condition management
 */
export const dndRemoveConditionHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateRemoveCondition,
  execute: executeRemoveCondition,
  approvalMessage: (request) => {
    const condition = request.parameters.condition || 'condition';
    const targetId = request.parameters.targetId || 'target';
    return `wants to remove ${condition} from ${targetId}`;
  }
};