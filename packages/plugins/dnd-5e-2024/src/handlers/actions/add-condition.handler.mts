/**
 * D&D 5e Add Condition Action Handler
 * 
 * Handles adding conditions to characters with D&D-specific validation:
 * - Condition compatibility checks
 * - Duration tracking and effects
 * - Immunity and resistance validation
 * - Stacking rules for conditions
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Interface for condition detail tracking
 */
interface ConditionDetail {
  condition: string;
  addedAt: number;
  duration?: number;
  source?: string;
}

/**
 * D&D 5e condition definitions with their properties
 */
const DND_CONDITIONS = {
  'blinded': { stackable: false, immunityCheck: true },
  'charmed': { stackable: false, immunityCheck: true },
  'deafened': { stackable: false, immunityCheck: true },
  'frightened': { stackable: false, immunityCheck: true },
  'grappled': { stackable: false, immunityCheck: false },
  'incapacitated': { stackable: false, immunityCheck: true },
  'invisible': { stackable: false, immunityCheck: false },
  'paralyzed': { stackable: false, immunityCheck: true },
  'petrified': { stackable: false, immunityCheck: true },
  'poisoned': { stackable: false, immunityCheck: true },
  'prone': { stackable: false, immunityCheck: false },
  'restrained': { stackable: false, immunityCheck: false },
  'stunned': { stackable: false, immunityCheck: true },
  'unconscious': { stackable: false, immunityCheck: true },
  'exhaustion': { stackable: true, immunityCheck: false, maxStacks: 6 },
  'concentration': { stackable: false, immunityCheck: false },
} as const;

/**
 * Validate adding condition to character
 */
export function validateAddCondition(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult {
  console.log('[DnD5e] Validating add condition:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as { 
    targetId?: string; 
    condition?: string; 
    duration?: number;
    source?: string;
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

  // Validate condition exists in D&D 5e
  const conditionKey = condition.toLowerCase();
  if (!(conditionKey in DND_CONDITIONS)) {
    return {
      valid: false,
      error: { 
        code: 'INVALID_CONDITION', 
        message: `Unknown D&D condition: ${condition}` 
      }
    };
  }

  const conditionDef = DND_CONDITIONS[conditionKey as keyof typeof DND_CONDITIONS];
  const currentConditions = (target.state?.conditions as string[]) || [];

  // 1. Check condition immunity (if applicable)
  if (conditionDef.immunityCheck) {
    const immunities = (target.pluginData as { conditionImmunities?: string[] }).conditionImmunities || [];
    if (immunities.includes(conditionKey)) {
      return {
        valid: false,
        error: { 
          code: 'CONDITION_IMMUNITY', 
          message: `${target.name} is immune to ${condition}` 
        }
      };
    }
  }

  // 2. Check stacking rules
  if (!conditionDef.stackable) {
    // Non-stackable condition - check if already present
    if (currentConditions.some(c => c.toLowerCase() === conditionKey)) {
      return {
        valid: false,
        error: { 
          code: 'CONDITION_ALREADY_PRESENT', 
          message: `${target.name} already has condition: ${condition}` 
        }
      };
    }
  } else {
    // Stackable condition - check maximum stacks
    if (conditionDef.maxStacks) {
      const currentStacks = currentConditions.filter(c => c.toLowerCase() === conditionKey).length;
      if (currentStacks >= conditionDef.maxStacks) {
        return {
          valid: false,
          error: { 
            code: 'MAX_STACKS_REACHED', 
            message: `${target.name} already has maximum stacks of ${condition} (${currentStacks}/${conditionDef.maxStacks})` 
          }
        };
      }
    }
  }

  // 3. Check for conflicting conditions
  const conflictingConditions: Record<string, string[]> = {
    'unconscious': ['conscious'], // Unconscious overrides conscious state
    'paralyzed': ['mobile'], // Paralyzed prevents movement
    'petrified': ['conscious', 'mobile'], // Petrified is a severe condition
  };

  if (conflictingConditions[conditionKey]) {
    const conflicts = conflictingConditions[conditionKey];
    const hasConflict = currentConditions.some(c => 
      conflicts.includes(c.toLowerCase())
    );
    
    if (hasConflict) {
      return {
        valid: false,
        error: { 
          code: 'CONDITION_CONFLICT', 
          message: `Cannot add ${condition} due to conflicting conditions` 
        }
      };
    }
  }

  console.log('[DnD5e] Add condition validation passed');
  return { valid: true };
}

/**
 * Execute adding condition to character
 */
export function executeAddCondition(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e] Executing add condition');

  const params = request.parameters as { 
    targetId?: string; 
    condition?: string; 
    duration?: number;
    source?: string;
  };
  const { targetId, condition, duration, source } = params;
  
  if (!targetId || !condition) {
    console.warn('[DnD5e] Invalid parameters during add condition execution');
    return;
  }

  // Find the target character/actor
  const target = draft.documents[targetId];
  if (!target) {
    console.warn('[DnD5e] Target not found during add condition execution');
    return;
  }

  // Initialize state if needed
  if (!target.state) target.state = {};
  if (!target.state.conditions) target.state.conditions = [];

  const conditions = target.state.conditions as string[];
  const conditionKey = condition.toLowerCase();

  // Add the condition
  conditions.push(condition);

  // Track condition details if duration or source provided
  if (duration || source) {
    if (!target.state.conditionDetails) target.state.conditionDetails = {};
    const conditionDetails = target.state.conditionDetails as Record<string, ConditionDetail>;
    
    const conditionEntry = {
      condition: condition,
      addedAt: Date.now(),
      ...(duration && { duration }),
      ...(source && { source })
    };

    // Use a unique key for the condition instance
    const instanceKey = `${condition}_${Date.now()}`;
    conditionDetails[instanceKey] = conditionEntry;
  }

  // Apply immediate effects based on condition type
  switch (conditionKey) {
    case 'unconscious':
      // Unconscious characters are also prone and incapacitated
      if (!conditions.includes('prone')) conditions.push('prone');
      if (!conditions.includes('incapacitated')) conditions.push('incapacitated');
      break;
      
    case 'paralyzed':
      // Paralyzed characters are also incapacitated
      if (!conditions.includes('incapacitated')) conditions.push('incapacitated');
      break;
      
    case 'petrified':
      // Petrified characters are also incapacitated
      if (!conditions.includes('incapacitated')) conditions.push('incapacitated');
      break;
  }

  console.log('[DnD5e] Condition added:', {
    targetName: target.name,
    condition,
    duration,
    source,
    totalConditions: conditions.length
  });
}

/**
 * D&D Add Condition Action Handler
 * Pure plugin action for D&D condition management
 */
export const dndAddConditionHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateAddCondition,
  execute: executeAddCondition,
  approvalMessage: (request) => {
    const condition = request.parameters.condition || 'condition';
    const targetId = request.parameters.targetId || 'target';
    return `wants to add ${condition} to ${targetId}`;
  }
};