/**
 * D&D 5e 2024 Monster Action Handler
 * 
 * Orchestrates complete monster action workflows including:
 * - Attack rolls (melee/ranged weapon attacks)
 * - Saving throw abilities (breath weapons, frightful presence, etc.)
 * - Damage application and condition effects
 * - Multi-target coordination
 * 
 * Follows the unified action handler pattern established by weapon-attack and spell-casting handlers.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals, ICharacter, IActor } from '@dungeon-lab/shared/types/index.mjs';
import type { DndCharacterData, DndCreatureData } from '../../types/dnd/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { ActionValidationResult, ActionValidationHandler, ActionExecutionHandler, ActionHandler } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { RollRequestSpec } from '@dungeon-lab/shared-ui/types/action-context.mjs';
import { parseDiceExpression } from '@dungeon-lab/shared/utils/dice-parser.mjs';
import { calculateD20Total } from '../../utils/dnd-roll-utilities.mjs';
import type { DndCreatureData } from '../../types/dnd/creature.mjs';
import type { actionSchema } from '../../types/dnd/stat-block.mjs';
import { z } from 'zod';

type MonsterAction = z.infer<typeof actionSchema>;

/**
 * Monster action request parameters
 */
interface MonsterActionParameters {
  actionName: string;
}

/**
 * Represents a target for monster actions
 */
interface MonsterActionTarget {
  tokenId: string;
  document: ICharacter | IActor;
  documentType: 'character' | 'actor';
  pluginData: DndCharacterData | DndCreatureData;
}

/**
 * Parse damage string into rollable components
 * Examples: "19 (2d10 + 8)", "63 (18d6) fire", "15 (2d6 + 8) slashing"
 */
function parseDamageString(damageStr: string): { average: number; formula: string; damageType?: string } | null {
  try {
    // Pattern: "average (dice formula) [damage type]"
    const match = damageStr.match(/^(\d+)\s*\(([^)]+)\)(?:\s+(\w+))?/);
    if (!match) {
      // Try simpler pattern: just "average" or "dice formula"
      const simpleMatch = damageStr.match(/^(\d+)$/) || damageStr.match(/^([d\d+\-\s]+)$/);
      if (simpleMatch) {
        const value = simpleMatch[1];
        if (/^\d+$/.test(value)) {
          return { average: parseInt(value), formula: value };
        } else {
          return { average: 0, formula: value };
        }
      }
      return null;
    }

    const [, averageStr, formula, damageType] = match;
    return {
      average: parseInt(averageStr),
      formula: formula.trim(),
      damageType: damageType?.toLowerCase()
    };
  } catch (error) {
    console.error('[MonsterAction] Error parsing damage string:', damageStr, error);
    return null;
  }
}

/**
 * Apply damage to a target creature
 * Reuses patterns from weapon-attack and spell-casting handlers
 */
function applyDamageToTarget(
  target: MonsterActionTarget,
  damage: number,
  damageType: string = 'unspecified'
): void {
  try {
    if (target.documentType === 'character') {
      // Character damage application
      const characterData = target.pluginData as { attributes?: { hitPoints?: { current: number; maximum: number } } };
      if (characterData.attributes?.hitPoints) {
        const oldHp = characterData.attributes.hitPoints.current;
        characterData.attributes.hitPoints.current = Math.max(0, oldHp - damage);
        console.log(`[MonsterAction] Applied ${damage} ${damageType} damage to character ${target.document.name} (${characterData.attributes.hitPoints.current}/${characterData.attributes.hitPoints.maximum} HP)`);
      } else {
        console.warn(`[MonsterAction] Character ${target.document.name} has no hitPoints structure`);
      }
    } else if (target.documentType === 'actor') {
      // Actor damage application - use pluginData.hitPoints.current
      const actorData = target.pluginData as { hitPoints?: { current: number; average: number } };
      if (actorData.hitPoints) {
        const maxHp = actorData.hitPoints.average;
        const currentHp = actorData.hitPoints.current ?? maxHp;
        actorData.hitPoints.current = Math.max(0, currentHp - damage);
        console.log(`[MonsterAction] Applied ${damage} ${damageType} damage to actor ${target.document.name} (${actorData.hitPoints.current}/${maxHp} HP)`);
      } else {
        console.warn(`[MonsterAction] Actor ${target.document.name} has no hitPoints structure`);
      }
    }
  } catch (error) {
    console.error(`[MonsterAction] Error applying damage to ${target.document.name}:`, error);
  }
}

/**
 * Apply condition to a target creature
 */
function applyConditionToTarget(
  target: MonsterActionTarget,
  condition: string
): void {
  try {
    // Apply condition to character or actor state
    const document = target.document;
    if (!document.state) {
      document.state = {};
    }
    if (!document.state.conditions) {
      document.state.conditions = [];
    }
    
    // Check if condition already exists
    if (!document.state.conditions.includes(condition)) {
      document.state.conditions.push(condition);
      console.log(`[MonsterAction] Applied condition '${condition}' to ${document.name}`);
    }
  } catch (error) {
    console.error(`[MonsterAction] Error applying condition '${condition}' to ${target.document.name}:`, error);
  }
}

/**
 * Get target's Armor Class for attack resolution
 */
function getTargetAC(target: MonsterActionTarget): number {
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
    console.error(`[MonsterAction] Error getting AC for ${target.document.name}:`, error);
    return 10;
  }
}

/**
 * Get target's saving throw bonus for a specific ability
 */
function getTargetSaveBonus(target: MonsterActionTarget, ability: string): number {
  try {
    const abilityMod = Math.floor(((getTargetAbilityScore(target, ability) || 10) - 10) / 2);
    
    // Check for saving throw proficiency
    let saveBonus = abilityMod;
    
    if (target.documentType === 'character') {
      const characterData = target.pluginData as DndCharacterData;
      const savingThrows = characterData.attributes?.savingThrows || {};
      if (savingThrows[ability]) {
        saveBonus = savingThrows[ability];
      }
    } else if (target.documentType === 'actor') {
      const actorData = target.pluginData as DndCreatureData;
      if (actorData.savingThrows && actorData.savingThrows[ability]) {
        saveBonus = actorData.savingThrows[ability];
      }
    }
    
    return saveBonus;
  } catch (error) {
    console.error(`[MonsterAction] Error getting save bonus for ${target.document.name}:`, error);
    return 0;
  }
}

/**
 * Get target's ability score
 */
function getTargetAbilityScore(target: MonsterActionTarget, ability: string): number {
  try {
    if (target.documentType === 'character') {
      const characterData = target.pluginData as { attributes?: { abilities?: Record<string, number> } };
      return characterData.attributes?.abilities?.[ability] || 10;
    } else if (target.documentType === 'actor') {
      const actorData = target.pluginData as { abilities?: Record<string, number> };
      return actorData.abilities?.[ability] || 10;
    }
    return 10;
  } catch (error) {
    console.error(`[MonsterAction] Error getting ability score for ${target.document.name}:`, error);
    return 10;
  }
}

/**
 * Resolve target documents from token IDs
 */
function resolveTargets(targetTokenIds: string[], gameState: ServerGameStateWithVirtuals): MonsterActionTarget[] {
  const targets: MonsterActionTarget[] = [];
  const encounter = gameState.currentEncounter;
  
  if (encounter?.tokens && targetTokenIds) {
    for (const tokenId of targetTokenIds) {
      const token = encounter.tokens[tokenId];
      if (token?.documentId) {
        // Find the document in campaign documents
        const foundDocument = Object.values(gameState.documents).find(doc => 
          doc.id === token.documentId
        );
        
        if (foundDocument && (foundDocument.documentType === 'character' || foundDocument.documentType === 'actor')) {
          const document = foundDocument as ICharacter | IActor;
          const documentType = foundDocument.documentType;
        
          targets.push({
            tokenId,
            document,
            documentType,
            pluginData: document.pluginData
          });
        } else {
          console.warn(`[MonsterAction] Could not resolve document for token ${tokenId}`);
        }
      }
    }
  }
  
  return targets;
}

/**
 * Monster Action Validation Handler
 */
const validateMonsterAction: ActionValidationHandler = async (
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<ActionValidationResult> => {
  try {
    const params = request.parameters as unknown as MonsterActionParameters;
    
    if (!params.actionName) {
      return {
        valid: false,
        error: { code: 'MISSING_ACTION_NAME', message: 'Action name is required' }
      };
    }
    
    // Find the acting creature
    const actingToken = gameState.currentEncounter?.tokens?.[request.actorTokenId || ''];
    if (!actingToken) {
      return {
        valid: false,
        error: { code: 'ACTING_TOKEN_NOT_FOUND', message: 'Acting token not found' }
      };
    }
    
    // Find the creature document
    const creature = Object.values(gameState.documents).find(doc => 
      doc.id === actingToken.documentId && doc.documentType === 'actor'
    ) as IActor | undefined;
    if (!creature) {
      return {
        valid: false,
        error: { code: 'ACTING_CREATURE_NOT_FOUND', message: 'Acting creature not found' }
      };
    }
    
    // Check if the creature has this action
    const creatureData = creature.pluginData as DndCreatureData;
    const action = creatureData.actions?.find(a => a.name === params.actionName);
    
    if (!action) {
      return {
        valid: false,
        error: { code: 'ACTION_NOT_FOUND', message: `Action '${params.actionName}' not found on creature ${creature.name}` }
      };
    }
    
    // Validate targets if required
    if (request.targetTokenIds?.length) {
      const targets = resolveTargets(request.targetTokenIds, gameState);
      if (targets.length !== request.targetTokenIds.length) {
        return {
          valid: false,
          error: { code: 'TARGETS_NOT_RESOLVED', message: 'One or more targets could not be resolved' }
        };
      }
    }
    
    // TODO: Check action economy (reactions, recharge, etc.)
    // TODO: Check range and line of sight
    
    return {
      valid: true
    };
    
  } catch (error) {
    console.error('[MonsterAction] Validation error:', error);
    return {
      valid: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed due to internal error' }
    };
  }
};

/**
 * Monster Action Execution Handler
 */
const executeMonsterAction: ActionExecutionHandler = async (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  context: AsyncActionContext
): Promise<void> => {
  try {
    const params = request.parameters as unknown as MonsterActionParameters;
    
    // Get the acting creature and action
    const actingToken = draft.currentEncounter!.tokens![request.actorTokenId!];
    const creature = Object.values(draft.documents).find(doc => 
      doc.id === actingToken.documentId && doc.documentType === 'actor'
    ) as IActor;
    const creatureData = creature.pluginData as DndCreatureData;
    const action = creatureData.actions!.find(a => a.name === params.actionName)!
    
    console.log(`[MonsterAction] Executing ${action.name} by ${creature.name}`);
    
    // Consume action economy immediately (before workflow execution)
    const creatureDraft = draft.documents[creature.id];
    if (!creatureDraft.state) creatureDraft.state = {};
    if (!creatureDraft.state.turnState) creatureDraft.state.turnState = {};
    if (!creatureDraft.state.turnState.actionsUsed) creatureDraft.state.turnState.actionsUsed = [];

    // Check if action already used (prevent spam)
    if (creatureDraft.state.turnState.actionsUsed.includes('action')) {
      throw new Error(`${creature.name} has already used their action this turn`);
    }

    // Mark action as used
    creatureDraft.state.turnState.actionsUsed.push('action');
    console.log(`[MonsterAction] Consumed action for ${creature.name}`);
    
    // Resolve targets
    const targets = request.targetTokenIds ? resolveTargets(request.targetTokenIds, draft) : [];
    console.log(`[MonsterAction] Target resolution:`, {
      targetTokenIds: request.targetTokenIds,
      targetsFound: targets.length,
      targetNames: targets.map(t => t.document.name)
    });

    if (targets.length === 0) {
      await context.sendChatMessage(
        `⚠️ No targets selected for ${action.name}. Please select target(s) first.`,
        {}
      );
      return; // Early exit with helpful message
    }
    
    // Analyze action to determine workflow
    const hasSavingThrow = action.savingThrow != null;
    // Assume any action without a saving throw is an attack (even if attackBonus missing)
    const shouldUseAttackWorkflow = !hasSavingThrow;
    
    // Execute workflow based on action properties
    if (shouldUseAttackWorkflow) {
      await executeAttackRollWorkflow(action, creature, targets, context, request);
    } else if (hasSavingThrow) {
      await executeSavingThrowWorkflow(action, creature, targets, context, request);
    } else {
      // Automatic effect (no rolls required)
      await executeAutomaticEffectWorkflow(action, creature, targets, context, request);
    }
    
    // Send completion message  
    await context.sendChatMessage(
      `${creature.name} uses ${action.name}!`,
      {}
    );
    
  } catch (error) {
    console.error('[MonsterAction] Execution error:', error);
    await context.sendChatMessage(
      `Error executing monster action: ${error}`,
      {}
    );
  }
};

/**
 * Execute attack roll workflow (Bite, Claw, Tail, etc.)
 */
async function executeAttackRollWorkflow(
  action: MonsterAction,
  creature: IActor,
  targets: MonsterActionTarget[],
  context: AsyncActionContext,
  request: GameActionRequest
): Promise<void> {
  console.log(`[MonsterAction] Executing attack roll workflow for ${action.name}`);
  
  // Handle missing or invalid attackBonus - default to 0
  const attackBonus = typeof action.attackBonus === 'number' ? action.attackBonus : 0;
  if (attackBonus === 0 && action.attackBonus !== 0) {
    console.warn(`[MonsterAction] Missing attackBonus for ${action.name}, using 0`);
  }
  
  for (const target of targets) {
    // Request attack roll
    const attackRoll: RollRequestSpec = {
      playerId: 'gm', // Monster actions are GM-controlled
      rollType: 'monster-attack',
      rollData: {
        chatComponentType: 'roll-request-d20',
        dice: [{ sides: 20, quantity: 1 }], // Monster attacks don't get advantage by default
        metadata: {
          defaultArgs: {
            baseModifier: attackBonus,
            conditionReasons: {
              advantage: [],
              disadvantage: []
            }
          },
          actionName: action.name,
          creatureName: creature.name,
          targetName: target.document.name,
          targetAC: getTargetAC(target)
        }
      }
    };
    
    try {
      const rollResult = await context.sendRollRequest(request.playerId, attackRoll.rollType, attackRoll.rollData);
      
      // Use calculated total from roll handler if available (handles advantage/disadvantage correctly)
      // Otherwise fall back to manual calculation for non-plugin rolls
      const attackTotal = 'calculatedTotal' in rollResult ? 
        (rollResult as { calculatedTotal: number }).calculatedTotal : 
        calculateD20Total(rollResult);
      
      const targetAC = getTargetAC(target);
      const isHit = attackTotal >= targetAC;
      
      // Check for critical hit/miss
      const isNaturalTwenty = rollResult.results.some(group => 
        group.sides === 20 && group.results.some(roll => roll === 20)
      );
      const isNaturalOne = rollResult.results.some(group => 
        group.sides === 20 && group.results.some(roll => roll === 1)
      );
      
      // Create structured attack result message matching weapon attack format
      let attackResultMessage = `${creature.name} attacks ${target.document.name} with ${action.name}: ${attackTotal} vs AC ${targetAC}`;
      if (isHit) {
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
      
      // Send structured roll result instead of chat message
      context.sendRollResult({
        message: attackResultMessage,
        result: attackTotal,
        target: targetAC,
        success: isHit,
        rollType: 'monster-attack',
        recipients: rollResult.recipients,
        chatComponentType: 'dnd-roll-card'
      }, rollResult);
      
      if (isHit) {
        // Roll and apply damage (using isNaturalTwenty from above)
        if (action.damage) {
          await rollAndApplyDamage(action, target, context, isNaturalTwenty, request);
        } else {
          await context.sendChatMessage(
            `⚠️ Could not find damage data for ${action.name}, please roll damage manually`,
            {}
          );
        }
        
        // Apply conditions
        if (action.conditionsImposed) {
          for (const condition of action.conditionsImposed) {
            applyConditionToTarget(target, condition);
          }
        }
      }
    } catch (error) {
      console.error(`[MonsterAction] Attack roll failed for ${target.document.name}:`, error);
      await context.sendChatMessage(
        `Attack roll failed for ${target.document.name}: ${error}`,
        {}
      );
    }
  }
}

/**
 * Execute saving throw workflow (Breath Weapon, Frightful Presence, etc.)
 */
async function executeSavingThrowWorkflow(
  action: MonsterAction,
  creature: IActor,
  targets: MonsterActionTarget[],
  context: AsyncActionContext,
  request: GameActionRequest
): Promise<void> {
  console.log(`[MonsterAction] Executing saving throw workflow for ${action.name}`);
  
  const savingThrow = action.savingThrow;
  
  for (const target of targets) {
    // Request saving throw
    const saveRoll: RollRequestSpec = {
      playerId: target.document.ownerId || 'gm',
      rollType: 'saving-throw',
      rollData: {
        chatComponentType: 'roll-request-d20',
        dice: [{ sides: 20, quantity: 1 }],
        metadata: {
          defaultArgs: {
            baseModifier: getTargetSaveBonus(target, savingThrow.ability),
            conditionReasons: {
              advantage: [],
              disadvantage: []
            }
          },
          ability: savingThrow.ability,
          dc: savingThrow.dc,
          actionName: action.name,
          creatureName: creature.name
        }
      }
    };
    
    try {
      const rollResult = await context.sendRollRequest(target.document.ownerId || 'gm', saveRoll.rollType, saveRoll.rollData);
      
      // Calculate save total from roll result
      let saveTotal = 0;
      for (const diceGroup of rollResult.results) {
        saveTotal += diceGroup.results.reduce((sum, result) => sum + result, 0);
      }
      for (const modifier of rollResult.modifiers) {
        saveTotal += modifier.value;
      }
      saveTotal += rollResult.arguments.customModifier;
      
      const isSuccess = saveTotal >= savingThrow.dc;
      
      await context.sendChatMessage(
        `${target.document.name}'s ${savingThrow.ability} save: ${saveTotal} vs DC ${savingThrow.dc} → ${isSuccess ? 'SUCCESS' : 'FAILURE'}`,
        {}
      );
      
      // Apply effects based on save result
      if (!isSuccess) {
        // Failed save - apply full effects
        if (action.damage) {
          await rollAndApplyDamage(action, target, context, false, request);
        }
        if (action.conditionsImposed) {
          for (const condition of action.conditionsImposed) {
            applyConditionToTarget(target, condition);
          }
        }
      } else {
        // Successful save - apply reduced effects (typically half damage)
        if (action.damage) {
          await rollAndApplyDamage(action, target, context, false, request, true); // halfDamage = true
        }
      }
    } catch (error) {
      console.error(`[MonsterAction] Saving throw failed for ${target.document.name}:`, error);
      await context.sendChatMessage(
        `Saving throw failed for ${target.document.name}: ${error}`,
        {}
      );
    }
  }
}

/**
 * Execute automatic effect workflow (no rolls required)
 */
async function executeAutomaticEffectWorkflow(
  action: MonsterAction,
  creature: IActor,
  targets: MonsterActionTarget[],
  context: AsyncActionContext,
  request: GameActionRequest
): Promise<void> {
  console.log(`[MonsterAction] Executing automatic effect workflow for ${action.name}`);
  
  for (const target of targets) {
    // Apply damage if specified
    if (action.damage) {
      await rollAndApplyDamage(action, target, context, false, request);
    }
    
    // Apply conditions
    if (action.conditionsImposed) {
      for (const condition of action.conditionsImposed) {
        applyConditionToTarget(target, condition);
      }
    }
  }
  
  await context.sendChatMessage(
    `${creature.name} activates ${action.name}`,
    {}
  );
}

/**
 * Roll and apply damage to a target
 */
async function rollAndApplyDamage(
  action: MonsterAction,
  target: MonsterActionTarget,
  context: AsyncActionContext,
  isCriticalHit: boolean = false,
  request: GameActionRequest,
  halfDamage: boolean = false
): Promise<void> {
  const damageData = parseDamageString(action.damage);
  if (!damageData) {
    console.warn(`[MonsterAction] Could not parse damage string: ${action.damage}`);
    return;
  }
  
  try {
    // Parse the damage formula
    const diceExpression = parseDiceExpression(damageData.formula);
    if (!diceExpression) {
      // Fallback to average damage
      let damage = damageData.average;
      if (isCriticalHit) damage *= 2;
      if (halfDamage) damage = Math.floor(damage / 2);
      
      applyDamageToTarget(target, damage, damageData.damageType || 'unspecified');
      
      // Send damage result with component type for rich damage card display
      context.sendRollResult({
        message: `${target.document.name} takes ${damage} ${damageData.damageType || ''} damage`,
        result: damage,
        success: true,
        rollType: 'monster-damage',
        chatComponentType: 'damage-card',
        damageInfo: {
          amount: damage,
          type: damageData.damageType || 'unspecified'
        }
      });
      return;
    }
    
    // Request damage roll
    const damageRoll: RollRequestSpec = {
      playerId: 'gm',
      rollType: 'damage',
      rollData: {
        dice: diceExpression.dice.map(die => ({
          sides: die.sides,
          quantity: isCriticalHit ? die.quantity * 2 : die.quantity
        })),
        metadata: {
          damageType: damageData.damageType,
          targetName: target.document.name,
          halfDamage
        }
      }
    };
    
    const rollResult = await context.sendRollRequest(request.playerId, damageRoll.rollType, damageRoll.rollData);
    
    // Calculate damage total from roll result
    let damage = 0;
    for (const diceGroup of rollResult.results) {
      damage += diceGroup.results.reduce((sum, result) => sum + result, 0);
    }
    for (const modifier of rollResult.modifiers) {
      damage += modifier.value;
    }
    damage += rollResult.arguments.customModifier;
    
    // Apply modifiers from the expression
    damage += diceExpression.modifier;
    
    if (halfDamage) {
      damage = Math.floor(damage / 2);
    }
    
    applyDamageToTarget(target, damage, damageData.damageType || 'unspecified');
    
    // Send damage result with component type for rich damage card display
    context.sendRollResult({
      message: `${target.document.name} takes ${damage} ${damageData.damageType || ''} damage${halfDamage ? ' (halved)' : ''}`,
      result: damage,
      success: true,
      rollType: 'monster-damage',
      chatComponentType: 'damage-card',
      damageInfo: {
        amount: damage,
        type: damageData.damageType || 'unspecified'
      }
    }, rollResult);
    
  } catch (error) {
    console.error(`[MonsterAction] Damage roll failed:`, error);
    // Fallback to average damage
    let damage = damageData.average;
    if (isCriticalHit) damage *= 2;
    if (halfDamage) damage = Math.floor(damage / 2);
    
    applyDamageToTarget(target, damage, damageData.damageType || 'unspecified');
    
    // Send damage result with component type for rich damage card display
    context.sendRollResult({
      message: `${target.document.name} takes ${damage} ${damageData.damageType || ''} damage (average)`,
      result: damage,
      success: true,
      rollType: 'monster-damage',
      chatComponentType: 'damage-card',
      damageInfo: {
        amount: damage,
        type: damageData.damageType || 'unspecified'
      }
    });
  }
}

/**
 * Export the complete monster action handler
 */
export const monsterActionHandler: ActionHandler = {
  validate: validateMonsterAction,
  execute: executeMonsterAction
};