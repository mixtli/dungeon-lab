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
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { ConditionInstance, DndConditionDocument } from '../../types/dnd/condition.mjs';
import { getPluginContext } from '@dungeon-lab/shared-ui/utils/plugin-context.mjs';

/**
 * Validate adding condition to character (Document-Based)
 */
const validateAddCondition: ActionValidationHandler = async (
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
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

  // Get condition document using plugin context
  const pluginContext = getPluginContext();
  if (!pluginContext) {
    return { valid: false, error: { code: 'NO_CONTEXT', message: 'Plugin context not available' } };
  }

  let conditionDoc: DndConditionDocument;
  try {
    if (conditionId) {
      conditionDoc = await pluginContext.getDocument(conditionId) as DndConditionDocument;
    } else {
      return {
        valid: false,
        error: { 
          code: 'INVALID_PARAMETERS', 
          message: 'Missing condition ID (slug-based lookup removed)' 
        }
      };
    }

    if (!conditionDoc) {
      return {
        valid: false,
        error: { 
          code: 'CONDITION_NOT_FOUND', 
          message: `Condition document not found: ${conditionId}` 
        }
      };
    }
  } catch (error) {
    console.error('[DnD5e] Failed to fetch condition document:', conditionId, error);
    return {
      valid: false,
      error: { 
        code: 'CONDITION_NOT_FOUND', 
        message: `Failed to fetch condition: ${conditionId}` 
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
 * Execute adding condition to character (Document-Based) - Synchronous Version
 * 
 * The condition should have been validated in the validate phase, so we can work
 * with the conditionId directly without doing async lookups.
 */
const executeAddCondition: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e] Executing add condition (document-based)');

  const params = request.parameters as { 
    targetId?: string; 
    conditionId?: string;
    level?: number;
    source?: string;
    metadata?: Record<string, unknown>;
  };
  const { targetId, conditionId, level = 1, source, metadata } = params;
  
  if (!targetId || !conditionId) {
    console.warn('[DnD5e] Invalid parameters during add condition execution');
    return;
  }

  // Find the target character/actor
  const target = draft.documents[targetId];
  if (!target) {
    console.warn('[DnD5e] Target not found during add condition execution');
    return;
  }

  // Get condition document using plugin context
  const pluginContext = getPluginContext();
  if (!pluginContext) {
    console.error('[DnD5e] Plugin context not available during execution');
    return;
  }

  let conditionDoc: DndConditionDocument;
  try {
    conditionDoc = await pluginContext.getDocument(conditionId) as DndConditionDocument;
    if (!conditionDoc) {
      console.error('[DnD5e] Condition document not found during execution:', conditionId);
      return;
    }
  } catch (error) {
    console.error('[DnD5e] Failed to fetch condition document during execution:', conditionId, error);
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
      const newInstance: ConditionInstance = {
        conditionId: conditionDoc.id,
        level,
        source,
        addedAt: Date.now(),
        metadata
      };
      conditions.push(newInstance);
      console.log('[DnD5e] Added new stackable condition:', {
        targetName: target.name,
        condition: conditionDoc.name,
        level
      });
    }
  } else {
    // Non-stackable condition - just add new instance
    const newInstance: ConditionInstance = {
      conditionId: conditionDoc.id,
      level,
      source,
      addedAt: Date.now(),
      metadata
    };
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
export const dndAddConditionHandler: Omit<ActionHandler, 'pluginId'> = {
  requiresManualApproval: true,
  validate: validateAddCondition,
  execute: executeAddCondition,
  approvalMessage: async (request) => {
    const params = request.parameters as { 
      conditionSlug?: string;
      conditionId?: string; 
      targetId?: string;
      level?: number;
    };
    
    // Get plugin context to resolve document names
    const pluginContext = getPluginContext();
    
    let conditionName = 'condition';
    let targetName = 'target';
    
    // Try to resolve condition name
    if (params.conditionId && pluginContext) {
      try {
        const conditionDoc = await pluginContext.getDocument(params.conditionId);
        if (conditionDoc) {
          conditionName = conditionDoc.name || conditionName;
        }
      } catch (error) {
        console.warn('[Add Condition] Failed to resolve condition name:', params.conditionId, error);
      }
    }
    
    // Try to resolve target name  
    if (params.targetId && pluginContext) {
      try {
        const targetDoc = await pluginContext.getDocument(params.targetId);
        if (targetDoc) {
          targetName = targetDoc.name || targetName;
        }
      } catch (error) {
        console.warn('[Add Condition] Failed to resolve target name:', params.targetId, error);
      }
    }
    
    const level = params.level || 1;
    if (level > 1) {
      return `wants to add ${conditionName} (level ${level}) to ${targetName}`;
    }
    return `wants to add ${conditionName} to ${targetName}`;
  }
};

// Export individual functions for compatibility
export { validateAddCondition, executeAddCondition };