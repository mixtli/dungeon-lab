/**
 * D&D 5e Assign Spell Action Handler
 * 
 * Handles assigning spells to characters by adding them to the character's
 * spellcasting.spells array. This action requires GM approval as it affects
 * character capabilities and balance.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { DndCharacterData } from '../../types/dnd/character.mjs';

/**
 * Assign spell action parameters
 */
export interface AssignSpellParameters extends Record<string, unknown> {
  spellId: string;
  targetCharacterId: string;
  spellName?: string; // For user-friendly messaging
  targetCharacterName?: string; // For user-friendly messaging
  class?: string; // Optional class override
  prepared?: boolean; // Optional prepared status override
  spellLevel?: number; // Spell level (0 for cantrips, 1-9 for spells) - provided by frontend
}

/**
 * Validate spell assignment request
 */
function validateAssignSpell(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): ActionValidationResult {
  const params = request.parameters as AssignSpellParameters;

  console.log('[AssignSpellHandler] Validating spell assignment:', {
    spellId: params.spellId,
    spellName: params.spellName,
    targetCharacterId: params.targetCharacterId,
    targetCharacterName: params.targetCharacterName,
    requestId: request.id
  });

  // Validate required parameters
  if (!params.spellId || !params.targetCharacterId) {
    return {
      valid: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Missing spell ID or target character ID'
      }
    };
  }

  // Validate spell level if provided
  if (params.spellLevel !== undefined && (params.spellLevel < 0 || params.spellLevel > 9)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_SPELL_LEVEL',
        message: 'Spell level must be between 0 (cantrip) and 9'
      }
    };
  }

  // Check if target character exists
  const targetCharacter = gameState.documents[params.targetCharacterId];
  if (!targetCharacter) {
    return {
      valid: false,
      error: {
        code: 'CHARACTER_NOT_FOUND',
        message: 'Target character not found in game state'
      }
    };
  }

  // Verify target is a character document
  if (targetCharacter.documentType !== 'character') {
    return {
      valid: false,
      error: {
        code: 'INVALID_TARGET_TYPE',
        message: 'Target document is not a character'
      }
    };
  }

  // Check if spell is already assigned to this character
  const characterData = targetCharacter.pluginData as DndCharacterData;
  const existingSpells = characterData?.spellcasting?.spells || [];
  
  if (existingSpells.some(spellData => spellData.spell === params.spellId)) {
    return {
      valid: false,
      error: {
        code: 'SPELL_ALREADY_ASSIGNED',
        message: 'Spell is already known by this character'
      }
    };
  }

  return { valid: true };
}

/**
 * Execute spell assignment using direct state mutation
 */
function executeAssignSpell(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals
): void {
  const params = request.parameters as AssignSpellParameters;

  console.log('[AssignSpellHandler] Executing spell assignment:', {
    spellId: params.spellId,
    spellName: params.spellName,
    targetCharacterId: params.targetCharacterId,
    targetCharacterName: params.targetCharacterName,
    requestId: request.id
  });

  // Get the character from the draft
  const targetCharacter = draft.documents[params.targetCharacterId];
  
  if (!targetCharacter) {
    throw new Error('Character not found during execution');
  }

  // Get character data and initialize spellcasting if needed
  const characterData = targetCharacter.pluginData as DndCharacterData;
  if (!characterData.spellcasting) {
    (characterData as any).spellcasting = {
      classes: {},
      spellSlots: {},
      spells: [],
      cantrips: []
    };
  }

  // Use spell level from parameters (provided by frontend)
  const spellLevel = params.spellLevel || 0;
  
  // Determine class (use override or default to first spellcasting class or 'Unknown')
  let spellClass = params.class;
  if (!spellClass) {
    const spellcastingClasses = Object.keys(characterData.spellcasting?.classes || {});
    spellClass = spellcastingClasses.length > 0 ? spellcastingClasses[0] : 'Unknown';
  }

  // Determine prepared status (use override or default based on spell level)
  const prepared = params.prepared !== undefined ? params.prepared : spellLevel > 0; // Cantrips are always "prepared"

  // Create spell data object
  const newSpellData = {
    name: params.spellName || 'Unknown Spell',
    spell: params.spellId,
    level: spellLevel,
    class: spellClass,
    prepared,
    alwaysPrepared: false
  };

  // Add to appropriate array based on spell level
  if (spellLevel === 0) {
    // Add to cantrips array
    characterData.spellcasting!.cantrips.push({
      name: params.spellName || 'Unknown Spell',
      spell: params.spellId,
      class: spellClass
    });
  } else {
    // Add to spells array
    characterData.spellcasting!.spells.push(newSpellData);
  }

  console.log('[AssignSpellHandler] Spell assignment executed successfully:', {
    spellId: params.spellId,
    spellName: params.spellName,
    spellLevel,
    spellClass,
    prepared,
    targetCharacterId: params.targetCharacterId,
    requestId: request.id,
    isCantrip: spellLevel === 0
  });
}

/**
 * D&D Assign Spell Action Handler
 * Plugin-specific spell assignment action
 */
export const dndAssignSpellHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateAssignSpell,
  execute: executeAssignSpell,
  approvalMessage: (request) => {
    const params = request.parameters as AssignSpellParameters;
    return `wants to assign "${params.spellName || 'a spell'}" to ${params.targetCharacterName || 'a character'}`;
  }
};