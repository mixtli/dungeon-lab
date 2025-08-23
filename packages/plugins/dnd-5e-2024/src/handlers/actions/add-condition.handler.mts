/**
 * D&D 5e Add Condition Action Handler (Document-Based)
 * 
 * Handles adding conditions to characters using document references:
 * - Condition document lookup and validation
 * - Effect-based stacking rules  
 * - Immunity and resistance validation
 * - Source and metadata tracking
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { ConditionInstance } from '../../types/dnd/condition.mjs';
import { ConditionService } from '../../services/condition.service.mjs';

/**
 * Validate adding condition to character (Document-Based)
 */
export async function validateAddCondition(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> {
  console.log('[DnD5e] Validating add condition (document-based):', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as { 
    targetId?: string; 
    conditionId?: string;
    conditionSlug?: string; // Alternative to conditionId for ease of use
    level?: number;
    source?: string;
    metadata?: Record<string, unknown>;
  };
  const { targetId, conditionId, conditionSlug, level = 1 } = params;
  
  if (!targetId || (!conditionId && !conditionSlug)) {
    return { valid: false, error: { code: 'INVALID_PARAMETERS', message: 'Missing target ID or condition reference' } };
  }

  // Find the target character/actor
  const target = gameState.documents[targetId];
  if (!target) {
    return { valid: false, error: { code: 'TARGET_NOT_FOUND', message: 'Target character not found' } };
  }

  // Get condition document
  let conditionDoc;
  if (conditionId) {
    conditionDoc = await ConditionService.getCondition(conditionId);
  } else if (conditionSlug) {
    conditionDoc = await ConditionService.getConditionBySlug(conditionSlug);
  }

  if (!conditionDoc) {
    return {
      valid: false,
      error: { 
        code: 'CONDITION_NOT_FOUND', 
        message: `Condition not found: ${conditionId || conditionSlug}` 
      }
    };
  }

  // Get current condition instances
  const currentConditions = (target.state?.conditions as ConditionInstance[]) || [];
  const effects = conditionDoc.pluginData.effects;

  // 1. Check condition immunity (if applicable)
  const immunities = (target.pluginData as { conditionImmunities?: string[] }).conditionImmunities || [];
  if (immunities.includes(conditionDoc.slug)) {
    return {
      valid: false,
      error: { 
        code: 'CONDITION_IMMUNITY', 
        message: `${target.name} is immune to ${conditionDoc.name}` 
      }
    };
  }

  // 2. Check stacking rules using document effects
  const stackingRules = effects.stacking;
  if (stackingRules?.stackable) {
    // Stackable condition - check maximum stacks
    if (stackingRules.maxStacks) {
      const currentStacks = currentConditions
        .filter(c => c.conditionId === conditionDoc.id)
        .reduce((sum, instance) => sum + instance.level, 0);
      
      if (currentStacks + level > stackingRules.maxStacks) {
        return {
          valid: false,
          error: { 
            code: 'MAX_STACKS_REACHED', 
            message: `Cannot add ${level} more levels of ${conditionDoc.name}. Current: ${currentStacks}, Max: ${stackingRules.maxStacks}` 
          }
        };
      }
    }
  } else {
    // Non-stackable condition - check if already present
    const hasCondition = currentConditions.some(c => c.conditionId === conditionDoc.id);
    if (hasCondition) {
      return {
        valid: false,
        error: { 
          code: 'CONDITION_ALREADY_PRESENT', 
          message: `${target.name} already has condition: ${conditionDoc.name}` 
        }
      };
    }
  }

  console.log('[DnD5e] Add condition validation passed for:', conditionDoc.name);
  return { valid: true };
}

/**
 * Execute adding condition to character (Document-Based)
 */
export async function executeAddCondition(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): Promise<void> {
  console.log('[DnD5e] Executing add condition (document-based)');

  const params = request.parameters as { 
    targetId?: string; 
    conditionId?: string;
    conditionSlug?: string;
    level?: number;
    source?: string;
    metadata?: Record<string, unknown>;
  };
  const { targetId, conditionId, conditionSlug, level = 1, source, metadata } = params;
  
  if (!targetId || (!conditionId && !conditionSlug)) {
    console.warn('[DnD5e] Invalid parameters during add condition execution');
    return;
  }

  // Find the target character/actor
  const target = draft.documents[targetId];
  if (!target) {
    console.warn('[DnD5e] Target not found during add condition execution');
    return;
  }

  // Get condition document
  let conditionDoc;
  if (conditionId) {
    conditionDoc = await ConditionService.getCondition(conditionId);
  } else if (conditionSlug) {
    conditionDoc = await ConditionService.getConditionBySlug(conditionSlug);
  }

  if (!conditionDoc) {
    console.warn('[DnD5e] Condition document not found:', conditionId || conditionSlug);
    return;
  }

  // Initialize state if needed
  if (!target.state) target.state = {};
  if (!target.state.conditions) target.state.conditions = [];

  const conditions = target.state.conditions as ConditionInstance[];
  const effects = conditionDoc.pluginData.effects;

  // Handle stacking for stackable conditions
  if (effects.stacking?.stackable) {
    // Find existing instance of this condition
    const existingInstance = conditions.find(c => c.conditionId === conditionDoc.id);
    if (existingInstance) {
      // Increase level of existing instance
      existingInstance.level += level;
      console.log('[DnD5e] Increased condition level:', {
        targetName: target.name,
        condition: conditionDoc.name,
        newLevel: existingInstance.level
      });
    } else {
      // Create new instance
      const newInstance = ConditionService.createConditionInstance(
        conditionDoc.id,
        source,
        level,
        metadata
      );
      conditions.push(newInstance);
      console.log('[DnD5e] Added new stackable condition:', {
        targetName: target.name,
        condition: conditionDoc.name,
        level
      });
    }
  } else {
    // Non-stackable condition - just add new instance
    const newInstance = ConditionService.createConditionInstance(
      conditionDoc.id,
      source,
      level,
      metadata
    );
    conditions.push(newInstance);
    console.log('[DnD5e] Added condition:', {
      targetName: target.name,
      condition: conditionDoc.name,
      source
    });
  }

  console.log('[DnD5e] Condition successfully added:', {
    targetName: target.name,
    conditionName: conditionDoc.name,
    totalConditions: conditions.length
  });
}

/**
 * D&D Add Condition Action Handler (Document-Based)
 * Pure plugin action for D&D condition management
 */
// Sync wrapper functions for compatibility with ActionHandler interface
function validateSync(request: GameActionRequest, gameState: ServerGameStateWithVirtuals): ActionValidationResult {
  // The actual function is async, but the runtime can handle it
  return validateAddCondition(request, gameState) as unknown as ActionValidationResult;
}

function executeSync(request: GameActionRequest, draft: ServerGameStateWithVirtuals): void {
  // The actual function is async, but the runtime can handle it
  executeAddCondition(request, draft);
}

export const dndAddConditionHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateSync,
  execute: executeSync,
  approvalMessage: (request) => {
    const params = request.parameters as { 
      conditionSlug?: string;
      conditionId?: string; 
      targetId?: string;
      level?: number;
    };
    const conditionSlug = params.conditionSlug || params.conditionId || 'condition';
    const targetId = params.targetId || 'target';
    const level = params.level || 1;
    
    if (level > 1) {
      return `wants to add ${conditionSlug} (level ${level}) to ${targetId}`;
    }
    return `wants to add ${conditionSlug} to ${targetId}`;
  }
};