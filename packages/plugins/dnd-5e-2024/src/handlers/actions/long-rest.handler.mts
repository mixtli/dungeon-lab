/**
 * D&D 5e Long Rest Action Handler
 * 
 * Handles long rest recovery with D&D-specific benefits:
 * - Restore all hit points to maximum
 * - Reset all spell slots (clear spellSlotsUsed)
 * - Reset class feature uses (clear classFeatureUses)
 * - Reset hit dice usage
 * - Clear exhaustion levels (if applicable)
 * - Validate long rest conditions
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionHandler, ActionValidationResult, ActionExecutionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Validate long rest requirements
 */
export async function validateLongRest(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> {
  console.log('[DnD5e] Validating long rest:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Find the character for this player
  const character = Object.values(gameState.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    return { valid: false, error: { code: 'NO_CHARACTER', message: 'Character not found for long rest' } };
  }

  // Check if character is unconscious or dead (cannot take long rest)
  const conditions = (character.state?.conditions as string[]) || [];
  if (conditions.includes('unconscious') || conditions.includes('dead')) {
    const blockingCondition = conditions.includes('dead') ? 'dead' : 'unconscious';
    return {
      valid: false,
      error: { 
        code: 'CANNOT_LONG_REST', 
        message: `Character cannot take long rest while ${blockingCondition}`
      }
    };
  }

  // Check if character is at 0 hit points (cannot long rest)
  const currentHp = (character.state?.currentHitPoints as number) ?? ((character.pluginData as { hitPointsMax?: number }).hitPointsMax ?? 0);
  if (currentHp <= 0) {
    return {
      valid: false,
      error: { 
        code: 'CANNOT_LONG_REST_NO_HP', 
        message: 'Character cannot take long rest at 0 hit points'
      }
    };
  }

  // Optional: Check for safe location, time requirements, etc.
  // These could be added based on campaign rules or request parameters
  
  console.log('[DnD5e] Long rest validation passed');
  return { valid: true };
}

/**
 * Execute long rest - restore resources and reset session state
 */
const executeLongRest: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  _context: AsyncActionContext
): Promise<void> => {
  console.log('[DnD5e] Executing long rest recovery');

  // Get character from validation (validation already confirmed it exists)
  const character = Object.values(draft.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId)!;

  // Initialize state if needed
  if (!character.state) character.state = {};
  
  // 1. Restore hit points to maximum
  const maxHp = (character.pluginData as { hitPointsMax?: number }).hitPointsMax || 0;
  character.state.currentHitPoints = maxHp;
  
  // 2. Reset all spell slots (clear spellSlotsUsed)
  character.state.spellSlotsUsed = {};
  
  // 3. Reset class feature uses (clear classFeatureUses)
  character.state.classFeatureUses = {};
  
  // 4. Reset hit dice used (partial recovery - regain half of total hit dice)
  const hitDice = (character.pluginData as { hitDice?: { total: number } }).hitDice;
  const totalHitDice = hitDice?.total || 0;
  const hitDiceToRecover = Math.max(1, Math.floor(totalHitDice / 2));
  const currentUsed = (character.state.hitDiceUsed as number) || 0;
  character.state.hitDiceUsed = Math.max(0, currentUsed - hitDiceToRecover);
  
  // 5. Clear exhaustion levels (if any)
  const exhaustionLevel = character.state.exhaustionLevel as number;
  if (exhaustionLevel && exhaustionLevel > 0) {
    character.state.exhaustionLevel = Math.max(0, exhaustionLevel - 1);
  }
  
  // 6. Clear any temporary conditions that should end on long rest
  if (character.state.conditions) {
    const temporaryConditions = ['charmed', 'frightened', 'poisoned'];
    const conditions = character.state.conditions as string[];
    character.state.conditions = conditions.filter(
      (condition: string) => !temporaryConditions.includes(condition.toLowerCase())
    );
  }
  
  console.log('[DnD5e] Long rest completed:', {
    characterName: character.name,
    restoredHp: maxHp,
    spellSlotsRestored: 'all',
    classFeatureUsesRestored: 'all',
    hitDiceUsed: character.state.hitDiceUsed,
    exhaustionLevel: (character.state.exhaustionLevel as number) || 0
  });
}

/**
 * D&D Long Rest Action Handler
 * Pure plugin action - provides D&D-specific rest mechanics
 */
export const dndLongRestHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateLongRest,
  execute: executeLongRest,
  approvalMessage: async () => 'wants to take a long rest and recover resources'
};