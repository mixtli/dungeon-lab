/**
 * D&D 5e 2024 Unified Weapon Attack Handler
 * 
 * Implements the unified action handler pattern for weapon attacks.
 * Handles complete weapon attack workflow including attack rolls,
 * hit determination, damage rolls, and action economy consumption.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals, ICharacter, IActor } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction
} from '../../utils/action-economy.mjs';
import { parseDiceExpression } from '@dungeon-lab/shared/utils/dice-parser.mjs';
import type { DndItemDocument, DndWeaponData } from '../../types/dnd/item.mjs';
import type { DndCharacterData } from '../../types/dnd/character.mjs';
import type { DndCreatureData } from '../../types/dnd/creature.mjs';

/**
 * Weapon attack request parameters
 */
interface WeaponAttackParameters {
  weaponId: string;
}

/**
 * Helper functions for weapon calculations
 */
function getWeaponAttackAbility(weaponData: DndWeaponData): string {
  const properties = weaponData.properties || [];
  const weaponType = weaponData.type;
  
  if (properties.includes('finesse')) {
    return 'dexterity';
  }
  
  if (weaponType === 'ranged') {
    return 'dexterity';
  }
  
  return 'strength';
}

function getAbilityModifier(caster: ICharacter | IActor, ability: string): number {
  if (caster.documentType === 'character') {
    // Character has complex ability objects with .value property
    const characterData = caster.pluginData as DndCharacterData;
    const abilityObj = characterData.abilities?.[ability as keyof typeof characterData.abilities];
    const abilityScore = abilityObj?.total || 10;
    return Math.floor((abilityScore - 10) / 2);
  } else {
    // Actor has simple number values for abilities  
    const creatureData = caster.pluginData as DndCreatureData;
    const abilityScore = creatureData.abilities?.[ability as keyof typeof creatureData.abilities] || 10;
    return Math.floor((abilityScore - 10) / 2);
  }
}

function isProficientWithWeapon(weapon: DndItemDocument, caster: ICharacter | IActor): boolean {
  if (caster.documentType === 'character') {
    // Characters have weapon proficiency lists
    const characterData = caster.pluginData as DndCharacterData;
    const weaponProficiencies = characterData.proficiencies?.weapons || [];
    const weaponData = weapon.pluginData as DndWeaponData;
    
    return weaponProficiencies.includes(weapon.id) ||
           weaponProficiencies.includes(weapon.name) ||
           (weaponData.category === 'simple' && weaponProficiencies.includes('simple-weapons')) ||
           (weaponData.category === 'martial' && weaponProficiencies.includes('martial-weapons'));
  } else {
    // Actors (monsters/NPCs) are assumed to be proficient with their weapons
    // Their stat blocks already include the correct attack bonuses
    return true;
  }
}

function getProficiencyBonus(caster: ICharacter | IActor): number {
  if (caster.documentType === 'character') {
    // Characters calculate proficiency bonus from level
    const characterData = caster.pluginData as DndCharacterData;
    const level = characterData.progression?.level || 1;
    return Math.ceil(level / 4) + 1;
  } else {
    // Actors have proficiency bonus directly in stat block
    const creatureData = caster.pluginData as DndCreatureData;
    return creatureData.proficiencyBonus || 2;
  }
}

/**
 * Validate weapon attack action
 */
const validateWeaponAttack: ActionValidationHandler = async (
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  console.log('[WeaponAttack] Validating weapon attack:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    targetTokenIds: request.targetTokenIds,
    parameters: request.parameters
  });

  try {
    const parameters = request.parameters as unknown as WeaponAttackParameters;
    
    // Get actor from required actorId (always available)
    const actor = gameState.documents[request.actorId];
    if (!actor) {
      return {
        valid: false,
        error: { code: 'ACTOR_NOT_FOUND', message: 'Actor not found' }
      };
    }

    // Get token if provided (for positioning/range calculations)
    let actorToken = null;
    if (request.actorTokenId) {
      actorToken = gameState.currentEncounter?.tokens?.[request.actorTokenId!];
      if (!actorToken) {
        return {
          valid: false,
          error: { code: 'TOKEN_NOT_FOUND', message: 'Actor token not found' }
        };
      }
      // Validate token represents the specified actor
      if (actorToken.documentId !== request.actorId) {
        return {
          valid: false,
          error: { code: 'TOKEN_MISMATCH', message: 'Token does not represent the specified actor' }
        };
      }
    }

    // Check if weapon exists in gameState.documents
    const weapon = gameState.documents[parameters.weaponId] as DndItemDocument | undefined;
    if (!weapon) {
      return {
        valid: false,
        error: { code: 'WEAPON_NOT_FOUND', message: `Weapon with ID ${parameters.weaponId} not found` }
      };
    }
    
    console.log('[WeaponAttack] Weapon:', weapon);
    // Verify it's actually a weapon
    if (weapon.pluginDocumentType !== 'weapon') {
      return {
        valid: false,
        error: { code: 'INVALID_WEAPON', message: `Document ${parameters.weaponId} is not a weapon` }
      };
    }

    // Validate action economy (weapon attacks consume an action)
    const actionValidation = await validateActionEconomy('action', actor, gameState, 'Attack');
    if (!actionValidation.valid) {
      return actionValidation;
    }

    console.log('[WeaponAttack] Validation successful for weapon:', weapon.name);
    return {
      valid: true
    };

  } catch (error) {
    console.error('[WeaponAttack] Validation failed:', error);
    return {
      valid: false,
      error: { code: 'VALIDATION_ERROR', message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    };
  }
}

/**
 * Execute weapon attack action
 */
const executeWeaponAttack: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  context: AsyncActionContext
): Promise<void> => {
  console.log('[WeaponAttack] Starting unified weapon attack execution:', {
    actorId: request.actorId,
    actorTokenId: request.actorTokenId,
    targetTokenIds: request.targetTokenIds,
    parameters: request.parameters
  });

  try {
    const parameters = request.parameters as unknown as WeaponAttackParameters;
    
    // Get actor from required actorId (always available)
    const actor = draft.documents[request.actorId];
    if (!actor) {
      throw new Error('Actor not found');
    }
    
    // Get token if provided (for positioning/range calculations)
    let actorToken = null;
    if (request.actorTokenId) {
      actorToken = draft.currentEncounter?.tokens?.[request.actorTokenId!];
      if (actorToken?.documentId !== request.actorId) {
        throw new Error('Token does not represent the specified actor');
      }
    }
    
    // Get weapon from draft.documents (validation already confirmed it exists and is valid)
    const weapon = draft.documents[parameters.weaponId] as DndItemDocument;
    
    const weaponData = weapon.pluginData as DndWeaponData;

    console.log('[WeaponAttack] Found weapon:', weapon.name, 'for actor:', actor.name);

    // Calculate weapon attack modifiers
    const modifiers = [];

    // Add ability modifier
    const ability = getWeaponAttackAbility(weaponData);
    const abilityMod = getAbilityModifier(actor as ICharacter | IActor, ability);
    if (abilityMod !== 0) {
      modifiers.push({
        name: `${ability.charAt(0).toUpperCase()}${ability.slice(1)} modifier`,
        value: abilityMod
      });
    }

    // Add proficiency bonus if proficient
    if (isProficientWithWeapon(weapon, actor as ICharacter | IActor)) {
      const profBonus = getProficiencyBonus(actor as ICharacter | IActor);
      modifiers.push({
        name: 'Proficiency bonus',
        value: profBonus
      });
    }

    // Add enchantment bonus if any
    const enchantmentBonus = weaponData.enchantmentBonus || 0;
    if (enchantmentBonus !== 0) {
      modifiers.push({
        name: 'Magic weapon',
        value: enchantmentBonus
      });
    }

    // Step 1: Make attack roll
    const attackResult = await context.sendRollRequest(request.playerId, 'weapon-attack', {
      dice: [{ sides: 20, quantity: 1 }],
      metadata: {
        characterName: actor.name,
        weaponName: weapon.name,
        weaponId: parameters.weaponId,
        actorId: request.actorId,
        actorTokenId: request.actorTokenId,
        targetTokenIds: request.targetTokenIds,
        modifiers: modifiers
      }
    });

    if (!attackResult) {
      throw new Error('Attack roll failed');
    }

    // Calculate attack total (need to manually sum since calculatedTotal may not exist)
    let attackTotal = 0;
    for (const diceGroup of attackResult.results) {
      attackTotal += diceGroup.results.reduce((sum, result) => sum + result, 0);
    }
    for (const modifier of attackResult.modifiers) {
      attackTotal += modifier.value;
    }
    attackTotal += attackResult.arguments.customModifier;

    // Determine if natural 20 or natural 1
    const isNaturalTwenty = attackResult.results.some(group => 
      group.sides === 20 && group.results.some(roll => roll === 20)
    );
    const isNaturalOne = attackResult.results.some(group => 
      group.sides === 20 && group.results.some(roll => roll === 1)
    );

    // For now, assume hit on anything but natural 1 (proper AC checking would need target resolution)
    const hits = isNaturalTwenty || (!isNaturalOne && attackTotal >= 10);
    
    console.log('[WeaponAttack] Attack roll result:', {
      total: attackTotal,
      hits,
      isNaturalTwenty,
      isNaturalOne
    });

    // Step 2: If attack hits, roll damage
    const damageDice = weaponData.damage?.dice;
    
    if (hits && damageDice) {
      // Calculate damage formula
      let damageFormula = damageDice;
      
      // Add ability modifier for damage
      const damageAbilityMod = getAbilityModifier(actor as ICharacter | IActor, ability);
      if (damageAbilityMod !== 0) {
        damageFormula += (damageAbilityMod >= 0 ? ' + ' : ' - ') + Math.abs(damageAbilityMod);
      }

      // Add enchantment bonus to damage too
      if (enchantmentBonus !== 0) {
        damageFormula += (enchantmentBonus >= 0 ? ' + ' : ' - ') + Math.abs(enchantmentBonus);
      }

      // Critical hit: double dice only
      if (isNaturalTwenty) {
        const diceMatch = damageDice.match(/(\d+)d(\d+)/);
        if (diceMatch) {
          const quantity = parseInt(diceMatch[1]);
          const sides = parseInt(diceMatch[2]);
          const doubleDice = `${quantity * 2}d${sides}`;
          
          // Rebuild formula with doubled dice but same modifiers
          damageFormula = doubleDice;
          if (damageAbilityMod !== 0) {
            damageFormula += (damageAbilityMod >= 0 ? ' + ' : ' - ') + Math.abs(damageAbilityMod);
          }
          if (enchantmentBonus !== 0) {
            damageFormula += (enchantmentBonus >= 0 ? ' + ' : ' - ') + Math.abs(enchantmentBonus);
          }
        }
        
        console.log('[WeaponAttack] Critical hit! Double damage dice:', damageFormula);
      }

      // Parse damage formula to dice array
      const parsedDamage = parseDiceExpression(damageFormula);
      if (!parsedDamage) {
        throw new Error(`Invalid damage formula: ${damageFormula}`);
      }
      
      const damageResult = await context.sendRollRequest(request.playerId, 'weapon-damage', {
        dice: parsedDamage.dice,
        metadata: {
          characterName: actor.name,
          weaponName: weapon.name,
          weaponId: parameters.weaponId,
          actorId: request.actorId,
          actorTokenId: request.actorTokenId,
          targetTokenIds: request.targetTokenIds,
          damageType: weaponData?.damage?.type || 'slashing',
          isCritical: isNaturalTwenty,
          attackHit: true,
          modifier: parsedDamage.modifier
        }
      });

      if (damageResult) {
        console.log('[WeaponAttack] Damage roll successful');
      } else {
        console.warn('[WeaponAttack] Damage roll failed, but attack succeeded');
      }
    }

    // Step 3: Update game state to consume action (draft is already mutable)
    const draftActor = draft.documents[request.actorId];
    if (draftActor) {
      consumeAction('action', draftActor, 'Attack');
      console.log(`[WeaponAttack] Consumed action for ${actor.name}`);
    }

  } catch (error) {
    console.error('[WeaponAttack] Handler execution failed:', error);
    throw error;
  }
}

/**
 * Export unified weapon attack handler
 */
export const weaponAttackHandler: Omit<ActionHandler, 'pluginId'> = {
  validate: validateWeaponAttack,
  execute: executeWeaponAttack,
  approvalMessage: async (request: GameActionRequest) => {
    const params = request.parameters as unknown as WeaponAttackParameters;
    return `wants to attack with weapon ${params.weaponId}`;
  },
  priority: 100
};

// Export the validation function separately for compatibility
export { validateWeaponAttack };