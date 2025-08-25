/**
 * D&D 5e Remove Condition Action Handler (Document-Based)
 * 
 * Handles removing conditions from characters using document references:
 * - Document-based condition validation
 * - Level-based removal for stackable conditions
 * - Recovery mechanics integration
 * - Source tracking and metadata
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { ConditionInstance, DndConditionDocument } from '../../types/dnd/condition.mjs';
import { getPluginContext } from '@dungeon-lab/shared-ui/utils/plugin-context.mjs';

/**
 * Conditions that automatically remove other conditions when removed
 * Maps condition slug to dependent condition slugs
 */
const CONDITION_DEPENDENCIES: Record<string, string[]> = {
  'unconscious': ['prone', 'incapacitated'], // Removing unconscious also removes these
  'paralyzed': ['incapacitated'], // Removing paralyzed also removes incapacitated
  'petrified': ['incapacitated'], // Removing petrified also removes incapacitated
};

/**
 * Validate removing condition from character (Document-Based)
 */
const validateRemoveCondition: ActionValidationHandler = async (
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e] Validating remove condition (document-based):', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  const params = request.parameters as { 
    targetId?: string; 
    conditionId?: string;
    conditionSlug?: string; // Alternative to conditionId for ease of use
    removeAll?: boolean; // Remove all instances of stackable conditions
    level?: number; // Remove specific level for stackable conditions
  };
  const { targetId, conditionId, conditionSlug } = params;
  
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

  // Check if target actually has the condition
  const currentConditions = (target.state?.conditions as ConditionInstance[]) || [];
  const hasCondition = currentConditions.some(c => c.conditionId === conditionDoc.id);
  
  if (!hasCondition) {
    return {
      valid: false,
      error: { 
        code: 'CONDITION_NOT_PRESENT', 
        message: `${target.name} does not have condition: ${conditionDoc.name}` 
      }
    };
  }

  // Check if there are any restrictions on removing this condition
  // (For example, some conditions might require specific methods to remove)
  
  // For now, all conditions can be removed if present
  console.log('[DnD5e] Remove condition validation passed for:', conditionDoc.name);
  return { valid: true };
}

/**
 * Execute removing condition from character (Document-Based)
 */
const executeRemoveCondition: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e] Executing remove condition (document-based)');

  const params = request.parameters as { 
    targetId?: string; 
    conditionId?: string;
    conditionSlug?: string;
    removeAll?: boolean;
    level?: number; // Remove specific level for stackable conditions
  };
  const { targetId, conditionId, conditionSlug, removeAll = false, level } = params;
  
  if (!targetId || (!conditionId && !conditionSlug)) {
    console.warn('[DnD5e] Invalid parameters during remove condition execution');
    return;
  }

  // Find the target character/actor
  const target = draft.documents[targetId];
  if (!target) {
    console.warn('[DnD5e] Target not found during remove condition execution');
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
    if (conditionId) {
      conditionDoc = await pluginContext.getDocument(conditionId) as DndConditionDocument;
    } else {
      console.warn('[DnD5e] Missing condition ID during execution (slug-based lookup removed)');
      return;
    }

    if (!conditionDoc) {
      console.warn('[DnD5e] Condition document not found:', conditionId);
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

  // Remove the condition(s)
  let removedCount = 0;
  let wasFullyRemoved = false;

  if (effects.stacking?.stackable && level && level > 0) {
    // Reduce level for stackable conditions
    const existingInstance = conditions.find(c => c.conditionId === conditionDoc.id);
    if (existingInstance) {
      existingInstance.level = Math.max(0, existingInstance.level - level);
      if (existingInstance.level === 0) {
        // Remove instance if level reaches 0
        const index = conditions.indexOf(existingInstance);
        conditions.splice(index, 1);
        wasFullyRemoved = true;
        removedCount = level;
      } else {
        removedCount = level;
      }
      console.log('[DnD5e] Reduced condition level:', {
        targetName: target.name,
        condition: conditionDoc.name,
        removedLevel: level,
        newLevel: existingInstance.level || 0
      });
    }
  } else if (removeAll) {
    // Remove all instances of this condition
    const originalLength = conditions.length;
    target.state.conditions = conditions.filter(c => c.conditionId !== conditionDoc.id);
    removedCount = originalLength - (target.state.conditions as ConditionInstance[]).length;
    if (removedCount > 0) wasFullyRemoved = true;
  } else {
    // Remove only the first instance (or oldest)
    const conditionIndex = conditions.findIndex(c => c.conditionId === conditionDoc.id);
    if (conditionIndex !== -1) {
      conditions.splice(conditionIndex, 1);
      removedCount = 1;
      wasFullyRemoved = true;
    }
  }

  // Handle cascading condition removal (only if condition was fully removed)
  if (wasFullyRemoved) {
    const dependentConditions = CONDITION_DEPENDENCIES[conditionDoc.slug];
    if (dependentConditions && dependentConditions.length > 0) {
      const updatedConditions = target.state.conditions as ConditionInstance[];
      
      for (const dependentSlug of dependentConditions) {
        // Find and remove dependent conditions
        let dependentIndex = -1;
        
        for (let i = 0; i < updatedConditions.length; i++) {
          const c = updatedConditions[i];
          try {
            const depCondition = await pluginContext.getDocument(c.conditionId) as DndConditionDocument;
            if (depCondition?.slug === dependentSlug) {
              dependentIndex = i;
              break;
            }
          } catch (error) {
            console.warn('[DnD5e] Failed to fetch dependent condition:', c.conditionId, error);
            continue;
          }
        }
        
        if (dependentIndex !== -1) {
          const removed = updatedConditions.splice(dependentIndex, 1)[0];
          console.log(`[DnD5e] Removed dependent condition: ${dependentSlug}`);
        }
      }
    }
  }

  // Apply any recovery effects based on condition removal
  if (wasFullyRemoved) {
    switch (conditionDoc.slug) {
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
  }

  console.log('[DnD5e] Condition removal complete:', {
    targetName: target.name,
    conditionName: conditionDoc.name,
    removedCount,
    removeAll,
    wasFullyRemoved,
    remainingConditions: (target.state.conditions as ConditionInstance[]).length
  });
}

/**
 * D&D Remove Condition Action Handler (Document-Based)
 * Pure plugin action for D&D condition management
 */
export const dndRemoveConditionHandler: Omit<ActionHandler, 'pluginId'> = {
  requiresManualApproval: true,
  validate: validateRemoveCondition,
  execute: executeRemoveCondition,
  approvalMessage: async (request) => {
    const params = request.parameters as {
      conditionSlug?: string;
      conditionId?: string;
      targetId?: string;
      level?: number;
      removeAll?: boolean;
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
        console.warn('[Remove Condition] Failed to resolve condition name:', params.conditionId, error);
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
        console.warn('[Remove Condition] Failed to resolve target name:', params.targetId, error);
      }
    }
    
    const level = params.level;
    const removeAll = params.removeAll;
    
    if (level && level > 0) {
      return `wants to reduce ${conditionName} by ${level} level(s) on ${targetName}`;
    } else if (removeAll) {
      return `wants to remove all instances of ${conditionName} from ${targetName}`;
    }
    return `wants to remove ${conditionName} from ${targetName}`;
  }
};

// Export individual functions for compatibility
export { validateRemoveCondition, executeRemoveCondition };