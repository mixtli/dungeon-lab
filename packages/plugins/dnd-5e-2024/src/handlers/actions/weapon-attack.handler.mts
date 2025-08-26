/**
 * D&D 5e 2024 Unified Weapon Attack Handler
 * 
 * Implements the unified action handler pattern for weapon attacks.
 * Handles complete weapon attack workflow including attack rolls,
 * hit determination, damage rolls, and action economy consumption.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals, ICharacter, IActor, IItem } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { 
  validateActionEconomy, 
  consumeAction
} from '../../utils/action-economy.mjs';
import { parseDiceExpression } from '@dungeon-lab/shared/utils/dice-parser.mjs';
import { calculateGridDistance } from '@dungeon-lab/shared-ui/utils/grid-distance.mjs';
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

/**
 * Apply damage to a target creature
 * Based on spell casting handler implementation
 */
function applyDamageToTarget(
  target: ICharacter | IActor, 
  damage: number, 
  damageType: string
): void {
  try {
    if (target.documentType === 'character') {
      // Character damage application
      const characterData = target.pluginData as { attributes?: { hitPoints?: { current: number; maximum: number } } };
      if (characterData.attributes?.hitPoints) {
        characterData.attributes.hitPoints.current = Math.max(
          0, 
          characterData.attributes.hitPoints.current - damage
        );
        console.log(`[WeaponAttack] Applied ${damage} ${damageType} damage to character ${target.name} (${characterData.attributes.hitPoints.current}/${characterData.attributes.hitPoints.maximum} HP)`);
      } else {
        console.warn(`[WeaponAttack] Character ${target.name} has no hitPoints structure`);
      }
    } else if (target.documentType === 'actor') {
      // Actor damage application  
      const actorData = target.pluginData as { hitPoints?: { current?: number; average: number } };
      if (actorData.hitPoints) {
        const currentHp = actorData.hitPoints.current ?? actorData.hitPoints.average;
        actorData.hitPoints.current = Math.max(0, currentHp - damage);
        console.log(`[WeaponAttack] Applied ${damage} ${damageType} damage to actor ${target.name} (${actorData.hitPoints.current}/${actorData.hitPoints.average} HP)`);
      } else {
        console.warn(`[WeaponAttack] Actor ${target.name} has no hitPoints structure`);
      }
    }
  } catch (error) {
    console.error(`[WeaponAttack] Error applying damage to ${target.name}:`, error);
  }
}

/**
 * Get target's Armor Class for attack resolution
 */
function getTargetAC(target: ICharacter | IActor): number {
  try {
    if (target.documentType === 'character') {
      const characterData = target.pluginData as { attributes?: { armorClass?: { value: number } } };
      return characterData.attributes?.armorClass?.value || 10;
    } else if (target.documentType === 'actor') {
      const actorData = target.pluginData as { armorClass?: { value: number } };
      return actorData.armorClass?.value || 10;
    }
    return 10;
  } catch (error) {
    console.error(`[WeaponAttack] Error getting AC for ${target.name}:`, error);
    return 10;
  }
}

/**
 * Resolve target documents from target token IDs
 */
function resolveTargetDocuments(targetTokenIds: string[], gameState: ServerGameStateWithVirtuals): (ICharacter | IActor)[] {
  const targets: (ICharacter | IActor)[] = [];
  const encounter = gameState.currentEncounter;
  
  if (encounter && encounter.tokens && targetTokenIds) {
    for (const targetTokenId of targetTokenIds) {
      const targetToken = encounter.tokens[targetTokenId];
      
      if (targetToken && targetToken.documentId) {
        const targetDocument = gameState.documents[targetToken.documentId];
        if (targetDocument && (targetDocument.documentType === 'character' || targetDocument.documentType === 'actor')) {
          targets.push(targetDocument as ICharacter | IActor);
        }
      }
    }
  }
  
  return targets;
}

/**
 * Resolve target names from target token IDs
 */
function resolveTargetNames(targetTokenIds: string[], gameState: ServerGameStateWithVirtuals): string[] {
  const targetNames: string[] = [];
  const encounter = gameState.currentEncounter;
  
  if (encounter && encounter.tokens && targetTokenIds) {
    for (const targetTokenId of targetTokenIds) {
      const targetToken = encounter.tokens[targetTokenId];
      let targetName = 'Unknown Target';
      
      if (targetToken && targetToken.documentId) {
        const targetDocument = gameState.documents[targetToken.documentId];
        if (targetDocument) {
          targetName = targetDocument.name || 'Unknown Target';
        }
      }
      
      targetNames.push(targetName);
    }
  }
  
  return targetNames;
}

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
    
    // Get actor from required actorId (must be available for weapon attack actions)
    if (!request.actorId) {
      return {
        valid: false,
        error: { code: 'MISSING_ACTOR_ID', message: 'Actor ID is required for weapon attack actions' }
      };
    }
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
    const weapon = gameState.documents[parameters.weaponId] as IItem | undefined;
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

    // Add type guard to ensure actor can perform actions
    if (actor.documentType !== 'character' && actor.documentType !== 'actor') {
      return {
        valid: false,
        error: { code: 'INVALID_ACTOR_TYPE', message: `Document ${request.actorId} cannot perform actions (type: ${actor.documentType})` }
      };
    }

    // Cast to proper type after validation
    const actionActor = actor as ICharacter | IActor;

    // Validate action economy (weapon attacks consume an action)
    const actionValidation = await validateActionEconomy('action', actionActor, gameState, 'Attack');
    if (!actionValidation.valid) {
      return actionValidation;
    }

    // Validate weapon range if actor token and targets are provided
    if (actorToken && request.targetTokenIds && request.targetTokenIds.length > 0) {
      const weaponData = weapon.pluginData as DndWeaponData;
      
      // Get weapon range in grid squares
      let weaponRangeSquares = 1; // Default melee range (5 feet = 1 square)
      
      if (weaponData.range) {
        // Ranged weapon: convert feet to grid squares
        weaponRangeSquares = Math.floor(weaponData.range.normal / 5);
      } else if (weaponData.type === 'ranged') {
        // Ranged weapon without range data - this is an error in the weapon definition
        return {
          valid: false,
          error: { code: 'MISSING_RANGE_DATA', message: `Ranged weapon ${weapon.name} is missing range data` }
        };
      }
      // For melee weapons without range data, use default 1 square
      
      // Check range to each target
      const encounter = gameState.currentEncounter;
      if (encounter && encounter.tokens) {
        for (const targetTokenId of request.targetTokenIds) {
          const targetToken = encounter.tokens[targetTokenId];
          if (!targetToken) {
            return {
              valid: false,
              error: { code: 'TARGET_TOKEN_NOT_FOUND', message: `Target token ${targetTokenId} not found` }
            };
          }
          
          // Calculate distance between actor and target tokens
          const distance = calculateGridDistance(
            { x: actorToken.bounds.topLeft.x, y: actorToken.bounds.topLeft.y },
            { x: targetToken.bounds.topLeft.x, y: targetToken.bounds.topLeft.y }
          );
          
          if (distance > weaponRangeSquares) {
            // Get target name for better error message
            let targetName = 'target';
            if (targetToken.documentId) {
              const targetDocument = gameState.documents[targetToken.documentId];
              if (targetDocument) {
                targetName = targetDocument.name || 'target';
              }
            }
            
            const weaponTypeDesc = weaponData.type === 'melee' ? 'melee' : 'ranged';
            const rangeDesc = weaponData.range ? 
              `${weaponData.range.normal} feet` : 
              '5 feet';
            
            return {
              valid: false,
              error: { 
                code: 'TARGET_OUT_OF_RANGE', 
                message: `${targetName} is too far away for ${weaponTypeDesc} attack. ${weapon.name} has a range of ${rangeDesc} (distance: ${distance * 5} feet)`
              }
            };
          }
        }
      }
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
    if (!request.actorId) {
      throw new Error('Actor ID is required for weapon attack actions');
    }
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

    // Step 1: Make attack roll with enhanced messaging
    
    // Resolve target names for better roll dialog
    const targetNames = resolveTargetNames(request.targetTokenIds || [], draft);
    
    // Create descriptive attack message
    let attackMessage = `${actor.name} attacks`;
    if (targetNames.length === 1) {
      attackMessage += ` ${targetNames[0]}`;
    } else if (targetNames.length > 1) {
      attackMessage += ` ${targetNames.length} targets`;
    }
    attackMessage += ` with ${weapon.name}`;
    
    const attackResult = await context.sendRollRequest(request.playerId, 'weapon-attack', {
      dice: [{ sides: 20, quantity: 1 }],
      message: attackMessage,
      metadata: {
        characterName: actor.name,
        weaponName: weapon.name,
        weaponId: parameters.weaponId,
        actorId: request.actorId,
        actorTokenId: request.actorTokenId,
        targetTokenIds: request.targetTokenIds,
        targetNames: targetNames,
        targetCount: targetNames.length,
        modifiers: modifiers,
        attackType: 'weapon-attack',
        weaponType: weaponData.type
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

    // Resolve target documents for proper AC checking
    const targetDocuments = resolveTargetDocuments(request.targetTokenIds || [], draft);
    
    // For single target, use their AC; for multiple targets, use the first target's AC (most common case)
    let targetAC = 10; // Default AC
    if (targetDocuments.length > 0) {
      targetAC = getTargetAC(targetDocuments[0]);
    }
    
    // Determine hit/miss based on actual AC
    const hits = isNaturalTwenty || (!isNaturalOne && attackTotal >= targetAC);
    
    console.log('[WeaponAttack] Attack roll result:', {
      total: attackTotal,
      targetAC,
      hits,
      isNaturalTwenty,
      isNaturalOne
    });

    // Send structured roll result to chat with AC information
    let attackResultMessage = `${attackMessage}: ${attackTotal} vs AC ${targetAC}`;
    if (hits) {
      if (isNaturalTwenty) {
        attackResultMessage += ' (Critical Hit!)';
      } else {
        attackResultMessage += ' (Hit)';
      }
    } else {
      if (isNaturalOne) {
        attackResultMessage += ' (Critical Miss)';
      } else {
        attackResultMessage += ' (Miss)';
      }
    }
    
    context.sendRollResult({
      message: attackResultMessage,
      result: attackTotal,
      target: targetAC,
      success: hits,
      rollType: 'weapon-attack'
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
      
      // Create descriptive damage message
      const damageType = weaponData?.damage?.type || 'slashing';
      let damageMessage = `${weapon.name} ${damageType} damage`;
      if (isNaturalTwenty) {
        damageMessage = `Critical hit! ${damageMessage}`;
      }
      if (targetNames.length === 1) {
        damageMessage += ` to ${targetNames[0]}`;
      } else if (targetNames.length > 1) {
        damageMessage += ` to ${targetNames.length} targets`;
      }
      
      const damageResult = await context.sendRollRequest(request.playerId, 'weapon-damage', {
        dice: parsedDamage.dice,
        message: damageMessage,
        metadata: {
          characterName: actor.name,
          weaponName: weapon.name,
          weaponId: parameters.weaponId,
          actorId: request.actorId,
          actorTokenId: request.actorTokenId,
          targetTokenIds: request.targetTokenIds,
          targetNames: targetNames,
          targetCount: targetNames.length,
          damageType: damageType,
          isCritical: isNaturalTwenty,
          attackHit: true,
          modifier: parsedDamage.modifier,
          attackType: 'weapon-damage',
          weaponType: weaponData.type
        }
      });

      if (damageResult) {
        console.log('[WeaponAttack] Damage roll successful');
        
        // Calculate total damage from roll result
        let totalDamage = 0;
        for (const diceGroup of damageResult.results) {
          totalDamage += diceGroup.results.reduce((sum, result) => sum + result, 0);
        }
        for (const modifier of damageResult.modifiers) {
          totalDamage += modifier.value;
        }
        totalDamage += damageResult.arguments.customModifier;
        
        console.log(`[WeaponAttack] Dealt ${totalDamage} ${damageType} damage`);
        
        // Apply damage to all targets
        for (const target of targetDocuments) {
          applyDamageToTarget(target, totalDamage, damageType);
        }
        
        // Send structured roll result for damage
        context.sendRollResult({
          message: `${weapon.name} ${damageType} damage${isNaturalTwenty ? ' (Critical Hit!)' : ''}`,
          result: totalDamage,
          success: true, // Damage rolls are always successful
          rollType: 'weapon-damage',
          damageInfo: {
            amount: totalDamage,
            type: damageType
          }
        });
      } else {
        console.warn('[WeaponAttack] Damage roll failed, but attack succeeded');
      }
    }

    // Step 3: Update game state to consume action (draft is already mutable)
    if (!request.actorId) {
      throw new Error('Actor ID is required for weapon attack actions');
    }
    const draftActor = draft.documents[request.actorId];
    if (draftActor) {
      // Add type guard to ensure actor can perform actions
      if (draftActor.documentType !== 'character' && draftActor.documentType !== 'actor') {
        throw new Error(`Document ${request.actorId} cannot perform actions (type: ${draftActor.documentType})`);
      }

      // Cast to proper type after validation
      const actionActor = draftActor as ICharacter | IActor;

      consumeAction('action', actionActor, 'Attack');
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