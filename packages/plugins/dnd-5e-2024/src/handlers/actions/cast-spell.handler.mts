/**
 * D&D 5e Cast Spell Action Handler
 * 
 * Handles spell casting with D&D-specific validation:
 * - Spell slot availability and consumption
 * - Action economy (action already used this turn)
 * - Condition checks (silenced, unconscious, etc.)
 * - Spell known/prepared validation
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Validate spell casting requirements
 */
export function validateSpellCasting(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult {
  console.log('[DnD5e] Validating spell casting:', {
    playerId: request.playerId,
    parameters: request.parameters
  });

  // Find the character for this player
  const character = Object.values(gameState.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    return { valid: false, error: { code: 'NO_CHARACTER', message: 'Character not found for spell casting' } };
  }

  const params = request.parameters as { 
    spellId?: string; 
    spellLevel?: number;
    castingTime?: 'action' | 'bonus_action' | 'reaction' | 'ritual';
  };
  const { spellId, spellLevel, castingTime = 'action' } = params;
  
  if (!spellId || typeof spellLevel !== 'number') {
    return { valid: false, error: { code: 'INVALID_PARAMETERS', message: 'Missing spell ID or level' } };
  }

  // 1. Check spell slots (pluginData.spellSlots vs state.spellSlotsUsed)
  const spellSlots = (character.pluginData as { spellSlots?: Record<string, { total: number }> }).spellSlots;
  const maxSlots = spellSlots?.[`level${spellLevel}`]?.total || 0;
  const spellSlotsUsed = (character.state?.spellSlotsUsed as Record<string, number>) || {};
  const usedSlots = spellSlotsUsed[`level${spellLevel}`] || 0;
  
  console.log('[DnD5e] Spell slot check:', {
    spellLevel,
    maxSlots,
    usedSlots,
    available: maxSlots - usedSlots
  });

  if (usedSlots >= maxSlots) {
    return {
      valid: false,
      error: { 
        code: 'NO_SPELL_SLOTS', 
        message: `No level ${spellLevel} spell slots remaining (${usedSlots}/${maxSlots} used)`
      }
    };
  }
  
  // 2. Check action economy based on casting time
  const actionsUsed = (character.state?.turnState?.actionsUsed as string[]) || [];
  
  switch (castingTime) {
    case 'action':
      if (actionsUsed.includes('action')) {
        return {
          valid: false,
          error: { code: 'ACTION_ALREADY_USED', message: 'Action already used this turn' }
        };
      }
      break;
      
    case 'bonus_action':
      if (actionsUsed.includes('bonus_action')) {
        return {
          valid: false,
          error: { code: 'BONUS_ACTION_ALREADY_USED', message: 'Bonus action already used this turn' }
        };
      }
      // D&D 5e rule: If you cast a bonus action spell, you can only cast cantrips with your action
      if (spellLevel > 0 && actionsUsed.includes('action')) {
        return {
          valid: false,
          error: { code: 'BONUS_ACTION_SPELL_RESTRICTION', message: 'Cannot cast leveled spell as bonus action if action already used' }
        };
      }
      break;
      
    case 'reaction':
      if (actionsUsed.includes('reaction')) {
        return {
          valid: false,
          error: { code: 'REACTION_ALREADY_USED', message: 'Reaction already used this turn' }
        };
      }
      break;
      
    case 'ritual':
      // Rituals don't consume action economy but take much longer
      break;
  }
  
  // 3. Check conditions preventing spellcasting (character.state.conditions)
  const conditions = (character.state?.conditions as string[]) || [];
  const spellBlockingConditions = ['silenced', 'unconscious', 'paralyzed', 'petrified', 'stunned'];
  const blockedByCondition = conditions.find((condition: string) => 
    spellBlockingConditions.includes(condition.toLowerCase())
  );
  
  if (blockedByCondition) {
    return {
      valid: false,
      error: { 
        code: 'CANNOT_CAST', 
        message: `Cannot cast spells due to condition: ${blockedByCondition}`
      }
    };
  }
  
  // 4. Check spell known/prepared (character.pluginData.spells)
  const spells = (character.pluginData as { spells?: { known?: string[]; prepared?: string[]; } }).spells;
  const knownSpells = spells?.known || [];
  const preparedSpells = spells?.prepared || [];
  
  if (!knownSpells.includes(spellId) && !preparedSpells.includes(spellId)) {
    return {
      valid: false,
      error: { 
        code: 'SPELL_NOT_KNOWN', 
        message: `Character does not know or have prepared: ${spellId}`
      }
    };
  }
  
  console.log('[DnD5e] Spell casting validation passed');
  return { 
    valid: true,
    resourceCosts: [{
      resourcePath: `spellSlotsUsed.level${spellLevel}`,
      amount: 1,
      storageType: 'state'
    }]
  };
}

/**
 * Execute spell casting - consume resources and update state
 */
export function executeSpellCasting(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  console.log('[DnD5e] Executing spell casting');

  // Find the character for this player
  const character = Object.values(draft.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    console.warn('[DnD5e] Character not found during spell casting execution');
    return;
  }

  const { spellLevel, castingTime = 'action' } = request.parameters as { 
    spellLevel?: number; 
    castingTime?: 'action' | 'bonus_action' | 'reaction' | 'ritual';
  };
  
  if (typeof spellLevel !== 'number') {
    console.warn('[DnD5e] Invalid spell level during execution');
    return;
  }
  
  // Initialize state if needed
  if (!character.state) character.state = {};
  if (!character.state.turnState) character.state.turnState = {};
  
  // 1. Consume spell slot (direct mutation - stored in sessionState/persistentState, not turnState)
  if (!character.state.spellSlotsUsed) character.state.spellSlotsUsed = {};
  const spellSlotsUsed = character.state.spellSlotsUsed as Record<string, number>;
  const currentUsed = spellSlotsUsed[`level${spellLevel}`] || 0;
  spellSlotsUsed[`level${spellLevel}`] = currentUsed + 1;
  
  // 2. Mark appropriate action type as used based on casting time
  if (castingTime !== 'ritual') { // Rituals don't consume action economy
    if (!character.state.turnState.actionsUsed) character.state.turnState.actionsUsed = [];
    const actionsUsed = character.state.turnState.actionsUsed as string[];
    
    if (!actionsUsed.includes(castingTime)) {
      actionsUsed.push(castingTime);
    }
  }
  
  console.log('[DnD5e] Spell casting state updated:', {
    characterName: character.name,
    spellLevel,
    castingTime,
    newSpellSlotsUsed: spellSlotsUsed[`level${spellLevel}`],
    actionsUsed: character.state.turnState.actionsUsed
  });
}

/**
 * D&D Cast Spell Action Handler
 * Pure plugin action - not enhancing a core action
 */
export const dndCastSpellHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateSpellCasting,
  execute: executeSpellCasting,
  approvalMessage: (request) => `wants to cast ${request.parameters.spellId || 'a spell'}`
};