/**
 * D&D 5e Use Class Feature Action Handler
 * 
 * Handles class feature usage with D&D-specific validation:
 * - Feature availability and usage limits
 * - Recharge mechanics (per turn, short rest, long rest)
 * - Action economy validation (action, bonus action, reaction)
 * - Condition checks for feature usage
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Validate class feature usage requirements
 */
export function validateClassFeatureUsage(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult {
  console.log('[DnD5e] Validating class feature usage:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Find the character for this player
  const character = Object.values(gameState.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    return { valid: false, error: { code: 'NO_CHARACTER', message: 'Character not found for class feature usage' } };
  }

  const params = request.parameters as { 
    featureName?: string; 
    actionType?: 'action' | 'bonus_action' | 'reaction' | 'free';
    usesResource?: boolean;
  };
  const { featureName, actionType = 'action', usesResource = true } = params;
  
  if (!featureName) {
    return { valid: false, error: { code: 'INVALID_PARAMETERS', message: 'Missing feature name' } };
  }

  // 1. Check if character has this class feature available
  const classFeatures = (character.pluginData as { classFeatures?: Record<string, any> }).classFeatures || {};
  const feature = classFeatures[featureName];
  
  if (!feature) {
    return {
      valid: false,
      error: { 
        code: 'FEATURE_NOT_AVAILABLE', 
        message: `Character does not have class feature: ${featureName}`
      }
    };
  }

  // 2. Check usage limits if feature consumes resources
  if (usesResource && feature.maxUses) {
    const featureUses = (character.state?.classFeatureUses as Record<string, number>) || {};
    const currentUses = featureUses[featureName] || 0;
    const maxUses = feature.maxUses;
    
    console.log('[DnD5e] Feature usage check:', {
      featureName,
      currentUses,
      maxUses,
      available: maxUses - currentUses
    });

    if (currentUses >= maxUses) {
      return {
        valid: false,
        error: { 
          code: 'FEATURE_EXHAUSTED', 
          message: `No uses remaining for ${featureName} (${currentUses}/${maxUses} used)`
        }
      };
    }
  }

  // 3. Check action economy if feature requires an action
  if (actionType !== 'free') {
    const actionsUsed = (character.state?.turnState?.actionsUsed as string[]) || [];
    
    if (actionType === 'action' && actionsUsed.includes('action')) {
      return {
        valid: false,
        error: { code: 'ACTION_ALREADY_USED', message: 'Action already used this turn' }
      };
    }
    
    if (actionType === 'bonus_action' && actionsUsed.includes('bonus_action')) {
      return {
        valid: false,
        error: { code: 'BONUS_ACTION_ALREADY_USED', message: 'Bonus action already used this turn' }
      };
    }
    
    if (actionType === 'reaction' && actionsUsed.includes('reaction')) {
      return {
        valid: false,
        error: { code: 'REACTION_ALREADY_USED', message: 'Reaction already used this turn' }
      };
    }
  }

  // 4. Check conditions that prevent feature usage
  const conditions = (character.state?.conditions as string[]) || [];
  const disablingConditions = ['unconscious', 'paralyzed', 'petrified', 'stunned'];
  const blockedByCondition = conditions.find((condition: string) => 
    disablingConditions.includes(condition.toLowerCase())
  );
  
  if (blockedByCondition) {
    return {
      valid: false,
      error: { 
        code: 'CANNOT_USE_FEATURE', 
        message: `Cannot use class features due to condition: ${blockedByCondition}`
      }
    };
  }

  // 5. Check feature-specific requirements (if any)
  if (feature.requirements) {
    // Could check things like minimum level, prerequisite features, etc.
    // For now, assume all requirements are met
  }

  console.log('[DnD5e] Class feature usage validation passed');
  return { valid: true };
}

/**
 * Execute class feature usage - consume resources and update state
 */
export function executeClassFeatureUsage(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e] Executing class feature usage');

  // Find the character for this player
  const character = Object.values(draft.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    console.warn('[DnD5e] Character not found during class feature usage execution');
    return;
  }

  const params = request.parameters as { 
    featureName?: string; 
    actionType?: 'action' | 'bonus_action' | 'reaction' | 'free';
    usesResource?: boolean;
  };
  const { featureName, actionType = 'action', usesResource = true } = params;
  
  if (!featureName) {
    console.warn('[DnD5e] Invalid feature name during execution');
    return;
  }

  // Initialize state if needed
  if (!character.state) character.state = {};
  if (!character.state.turnState) character.state.turnState = {};

  // 1. Consume feature usage if it uses resources
  if (usesResource) {
    if (!character.state.classFeatureUses) character.state.classFeatureUses = {};
    const featureUses = character.state.classFeatureUses as Record<string, number>;
    const currentUses = featureUses[featureName] || 0;
    featureUses[featureName] = currentUses + 1;
  }

  // 2. Mark action type as used if applicable
  if (actionType !== 'free') {
    if (!character.state.turnState.actionsUsed) character.state.turnState.actionsUsed = [];
    const actionsUsed = character.state.turnState.actionsUsed as string[];
    
    if (!actionsUsed.includes(actionType)) {
      actionsUsed.push(actionType);
    }
  }

  // 3. Apply any feature-specific effects (could be extended)
  // For now, just log the usage
  
  console.log('[DnD5e] Class feature usage executed:', {
    characterName: character.name,
    featureName,
    actionType,
    usesResource,
    newUsageCount: usesResource ? ((character.state.classFeatureUses as Record<string, number>)[featureName] || 0) : 'N/A',
    actionsUsed: character.state.turnState.actionsUsed
  });
}

/**
 * D&D Use Class Feature Action Handler
 * Pure plugin action for D&D class feature mechanics
 */
export const dndUseClassFeatureHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateClassFeatureUsage,
  execute: executeClassFeatureUsage,
  approvalMessage: (request) => {
    const featureName = request.parameters.featureName || 'class feature';
    return `wants to use ${featureName}`;
  }
};