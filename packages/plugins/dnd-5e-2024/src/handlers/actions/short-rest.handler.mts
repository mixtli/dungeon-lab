/**
 * D&D 5e Short Rest Action Handler
 * 
 * Handles short rest mechanics with D&D-specific resource recovery:
 * - Hit dice usage and recovery
 * - Class features that recharge on short rest
 * - Healing during short rest
 * - Validation of short rest conditions
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionHandler, ActionValidationResult, ActionValidationHandler, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Validate short rest requirements
 */
export const validateShortRest: ActionValidationHandler = async (
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[DnD5e] Validating short rest:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Find the character for this player
  const character = Object.values(gameState.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    return { valid: false, error: { code: 'NO_CHARACTER', message: 'Character not found for short rest' } };
  }

  // Check if character is already at full hit points (optional validation)
  const currentHp = (character.state?.currentHitPoints as number) || 0;
  const maxHp = (character.pluginData as { hitPointsMax?: number }).hitPointsMax || 0;
  
  // Check if character has any hit dice available to spend
  const hitDiceUsed = (character.state?.hitDiceUsed as number) || 0;
  const totalHitDice = (character.pluginData as { level?: number }).level || 1;
  const availableHitDice = totalHitDice - hitDiceUsed;

  console.log('[DnD5e] Short rest check:', {
    characterName: character.name,
    currentHp,
    maxHp,
    hitDiceUsed,
    totalHitDice,
    availableHitDice
  });

  // Validate that there's something to recover (either HP or hit dice)
  if (currentHp >= maxHp && availableHitDice <= 0) {
    return {
      valid: false,
      error: { 
        code: 'NO_RECOVERY_NEEDED', 
        message: 'Character is at full hit points and has no hit dice to recover'
      }
    };
  }

  console.log('[DnD5e] Short rest validation passed');
  return { valid: true };
}

/**
 * Execute short rest - restore resources and apply healing
 */
export const executeShortRest: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e] Executing short rest');

  // Get character from validation (validation already confirmed it exists)
  const character = Object.values(draft.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId)!;

  // Initialize state if needed
  if (!character.state) character.state = {};

  const params = request.parameters as { hitDiceToSpend?: number; healingRoll?: number };
  const { hitDiceToSpend = 0, healingRoll = 0 } = params;

  // 1. Apply hit dice healing if specified
  if (hitDiceToSpend > 0 && healingRoll > 0) {
    const currentHp = (character.state.currentHitPoints as number) || 0;
    const maxHp = (character.pluginData as { hitPointsMax?: number }).hitPointsMax || 0;
    const newHp = Math.min(currentHp + healingRoll, maxHp);
    
    character.state.currentHitPoints = newHp;
    
    // Track hit dice usage
    const currentHitDiceUsed = (character.state.hitDiceUsed as number) || 0;
    character.state.hitDiceUsed = currentHitDiceUsed + hitDiceToSpend;
  }

  // 2. Restore short rest class features (if any are defined)
  // This resets features that recharge on short rest
  if (!character.state.classFeatureUses) character.state.classFeatureUses = {};
  const classFeatureUses = character.state.classFeatureUses as Record<string, number>;
  
  // Get short rest features from pluginData
  const shortRestFeatures = (character.pluginData as { shortRestFeatures?: string[] }).shortRestFeatures || [];
  
  // Reset short rest features to 0 uses
  for (const featureName of shortRestFeatures) {
    classFeatureUses[featureName] = 0;
  }

  // 3. Clear any temporary conditions that end on short rest
  const conditions = (character.state?.conditions as string[]) || [];
  const shortRestClearConditions = ['exhaustion-1']; // Some conditions clear on short rest
  
  const updatedConditions = conditions.filter(condition => 
    !shortRestClearConditions.includes(condition.toLowerCase())
  );
  
  if (updatedConditions.length !== conditions.length) {
    character.state.conditions = updatedConditions;
  }

  console.log('[DnD5e] Short rest completed:', {
    characterName: character.name,
    hitDiceSpent: hitDiceToSpend,
    healingApplied: healingRoll,
    newHitPoints: character.state.currentHitPoints,
    featuresReset: shortRestFeatures,
    conditionsCleared: conditions.length - updatedConditions.length
  });
}

/**
 * D&D Short Rest Action Handler
 * Pure plugin action for D&D short rest mechanics
 */
export const dndShortRestHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateShortRest,
  execute: executeShortRest,
  approvalMessage: async () => 'wants to take a short rest'
};