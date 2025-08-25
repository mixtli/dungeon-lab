/**
 * D&D 5e 2024 Unified Spell Casting Handler
 * 
 * Implements the unified action handler pattern for spell casting.
 * Handles all spell types through data-driven conditional logic following
 * the architecture proposal in docs/proposals/unified-action-handler-spell-casting.md
 * 
 * Key Features:
 * - Single executeSpellCast function manages complete spell workflow
 * - Local variable persistence (spell, caster, targets) throughout execution  
 * - AsyncActionContext integration for roll requests and messaging
 * - Data-driven conditional logic based on spell properties
 * - Multi-target coordination with Promise-based roll correlation
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared/interfaces/action-context.interface.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/types/socket/index.mjs';
import type { RollRequestSpec } from '@dungeon-lab/shared/interfaces/action-context.interface.mjs';
import { 
  lookupSpell, 
  getCasterForToken, 
  getTargetForToken,
  hasSpellSlotsAvailable,
  consumeSpellSlot,
  calculateSpellAttackBonus,
  calculateTargetSaveBonus,
  getSpellDamage,
  getSpellSavingThrow,
  type SpellTarget
} from '../../services/spell-lookup.service.mjs';
import { 
  validateActionEconomy, 
  consumeAction, 
  findPlayerCharacter, 
  findPlayerCharacterInDraft,
  type DnDActionType
} from '../../utils/action-economy.mjs';

/**
 * Spell casting request parameters
 */
interface SpellCastParameters {
  spellId: string;
  casterTokenId: string;
  targetTokenIds: string[];
  spellSlotLevel: number;
  castingTime?: 'action' | 'bonus_action' | 'reaction' | 'ritual';
}

/**
 * Convert casting time to D&D action type for action economy
 */
function getActionTypeFromCastingTime(castingTime: string | undefined): DnDActionType | null {
  switch (castingTime) {
    case 'action':
      return 'action';
    case 'bonus_action':
      return 'bonus-action';
    case 'reaction':
      return 'reaction';
    case 'ritual':
      return null; // Rituals don't consume action economy
    default:
      return 'action'; // Default to action for spells without specified casting time
  }
}

/**
 * Apply damage to a target creature
 * TODO: This should eventually use a centralized damage application system
 */
function applyDamageToTarget(
  draft: ServerGameStateWithVirtuals, 
  target: SpellTarget, 
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
        console.log(`[SpellCasting] Applied ${damage} ${damageType} damage to character ${target.name} (${characterData.attributes.hitPoints.current}/${characterData.attributes.hitPoints.maximum} HP)`);
      }
    } else if (target.documentType === 'actor') {
      // Actor damage application  
      const actorData = target.pluginData as { hitPoints?: { current?: number; average: number } };
      if (actorData.hitPoints) {
        const currentHp = actorData.hitPoints.current ?? actorData.hitPoints.average;
        actorData.hitPoints.current = Math.max(0, currentHp - damage);
        console.log(`[SpellCasting] Applied ${damage} ${damageType} damage to actor ${target.name} (${actorData.hitPoints.current}/${actorData.hitPoints.average} HP)`);
      }
    }
  } catch (error) {
    console.error(`[SpellCasting] Error applying damage to ${target.name}:`, error);
  }
}

/**
 * Get target's Armor Class for attack resolution
 */
function getTargetAC(target: SpellTarget): number {
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
    console.error(`[SpellCasting] Error getting AC for ${target.name}:`, error);
    return 10;
  }
}

/**
 * Unified spell casting action handler
 * Handles all spell types through data-driven conditional logic
 * 
 * Following the exact architecture from the proposal:
 * 1. Parameter extraction and setup (universal)
 * 2. Phase 1: Spell Attack (conditional on spell.attackRoll) 
 * 3. Phase 2: Saving Throws (skipped in Phase 2.2, implemented in Phase 3.1)
 * 4. Phase 3: Damage Application (conditional on spell.damage)
 * 5. Phase 4: Additional Effects (skipped in Phase 2.2, implemented in Phase 3.3)
 */
export async function executeSpellCast(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals, 
  context: AsyncActionContext
): Promise<void> {
  console.log('[SpellCasting] Starting unified spell casting workflow');
  
  try {
    // ==========================================
    // PARAMETER EXTRACTION & SETUP (Universal)
    // ==========================================
    
    const parameters = request.parameters as SpellCastParameters;
    const { spellId, casterTokenId, targetTokenIds, spellSlotLevel } = parameters;
    
    if (!spellId || !casterTokenId || !targetTokenIds || typeof spellSlotLevel !== 'number') {
      throw new Error('Invalid spell casting parameters');
    }
    
    console.log('[SpellCasting] Parameters:', {
      spellId,
      casterTokenId, 
      targetCount: targetTokenIds.length,
      spellSlotLevel
    });
    
    // Look up spell data and participants (local variables persist throughout!)
    const spell = await lookupSpell(spellId, context.pluginContext);
    if (!spell) {
      throw new Error(`Spell not found: ${spellId}`);
    }
    
    const caster = getCasterForToken(casterTokenId, draft);
    if (!caster) {
      throw new Error(`Caster not found for token: ${casterTokenId}`);
    }
    
    const targets = targetTokenIds.map(id => getTargetForToken(id, draft)).filter(Boolean) as SpellTarget[];
    if (targets.length === 0) {
      throw new Error('No valid targets found');
    }
    
    console.log(`[SpellCasting] Casting ${spell.pluginData.name} from ${caster.name} at ${targets.length} targets`);
    
    // Universal validation and spell slot consumption
    if (!hasSpellSlotsAvailable(caster, spellSlotLevel)) {
      throw new Error(`No available level ${spellSlotLevel} spell slots`);
    }
    
    // Consume spell slot (works in Immer draft context)
    const slotConsumed = consumeSpellSlot(caster, spellSlotLevel);
    if (!slotConsumed) {
      throw new Error(`Failed to consume level ${spellSlotLevel} spell slot`);
    }
    
    console.log(`[SpellCasting] Consumed level ${spellSlotLevel} spell slot for ${caster.name}`);
    
    // Consume action economy (works in Immer draft context)
    const actionType = getActionTypeFromCastingTime(parameters.castingTime);
    if (actionType) {
      const character = findPlayerCharacterInDraft(request.playerId, draft);
      if (character) {
        consumeAction(actionType, character, 'Magic');
        console.log(`[SpellCasting] Consumed ${actionType} action for ${character.name}`);
      } else {
        console.warn('[SpellCasting] Character not found for action consumption');
      }
    }
    
    // ==========================================
    // PHASE 1: SPELL ATTACK (Data-Driven)
    // ==========================================
    // Examples: Fire Bolt (attack only), Ice Knife (attack + save)
    let attackResults: RollServerResult[] = [];
    let attackHits: boolean[] = [];
    
    if (spell.pluginData.attackRoll) {
      console.log('[SpellCasting] Spell has attackRoll field - requesting attack rolls');
      
      // Request attack rolls for all targets using AsyncActionContext
      const attackRequests: RollRequestSpec[] = targets.map(target => ({
        playerId: request.playerId,
        rollType: 'spell-attack',
        rollData: {
          message: `${spell.pluginData.name} attack vs ${target.name}`,
          dice: [{ sides: 20, quantity: 1 }],
          metadata: {
            spellId,
            targetId: target.id,
            attackBonus: calculateSpellAttackBonus(caster),
            spellName: spell.pluginData.name
          }
        }
      }));
      
      // Use Promise-based correlation for all attack rolls
      attackResults = await context.sendMultipleRollRequests(attackRequests);
      
      // Determine hits/misses for each target and send result messages
      attackHits = attackResults.map((result, i) => {
        // Calculate total from dice results
        const total = result.results.reduce((sum, diceGroup) => 
          sum + diceGroup.results.reduce((groupSum, roll) => groupSum + roll, 0), 0
        );
        const attackBonus = calculateSpellAttackBonus(caster);
        const finalTotal = total + attackBonus;
        const targetAC = getTargetAC(targets[i]);
        const isHit = finalTotal >= targetAC;
        
        console.log(`[SpellCasting] Attack vs ${targets[i].name}: ${total} + ${attackBonus} = ${finalTotal} vs AC ${targetAC} → ${isHit ? 'HIT' : 'MISS'}`);
        
        // Send structured roll result to chat
        context.sendRollResult({
          message: `${spell.pluginData.name} attack vs ${targets[i].name}`,
          result: finalTotal,
          target: targetAC,
          success: isHit,
          rollType: 'spell-attack'
        });
        
        return isHit;
      });
      
      const hitCount = attackHits.filter(hit => hit).length;
      console.log(`[SpellCasting] ${hitCount}/${targets.length} attacks hit`);
      
      // Early exit for attack spells that completely miss (unless they have saving throws)
      if (hitCount === 0 && !spell.pluginData.savingThrow) {
        await context.sendChatMessage(`${spell.pluginData.name} - All attacks missed!`);
        console.log('[SpellCasting] All attacks missed, spell completed');
        return;
      }
    }
    
    // ==========================================
    // PHASE 2: SAVING THROWS (Data-Driven)
    // ==========================================
    // Examples: Fireball (save only), Ice Knife (attack + save), Sacred Flame (save only)
    let saveResults: RollServerResult[] = [];
    let saveSuccesses: boolean[] = [];
    
    if (spell.pluginData.savingThrow) {
      console.log('[SpellCasting] Spell has savingThrow field - requesting saving throws');
      
      const saveInfo = getSpellSavingThrow(spell, caster);
      if (!saveInfo) {
        console.warn('[SpellCasting] Failed to get saving throw information');
      } else {
        console.log(`[SpellCasting] Requesting ${saveInfo.ability} saving throws against DC ${saveInfo.dc}`);
        
        // Request saving throw rolls for all targets using AsyncActionContext
        const saveRequests: RollRequestSpec[] = targets.map(target => ({
          playerId: request.playerId,
          rollType: 'saving-throw',
          rollData: {
            message: `${target.name} ${saveInfo.ability} save vs ${spell.pluginData.name}`,
            dice: [{ sides: 20, quantity: 1 }],
            metadata: {
              spellId,
              targetId: target.id,
              saveBonus: calculateTargetSaveBonus(target, saveInfo.ability),
              saveDC: saveInfo.dc,
              saveAbility: saveInfo.ability,
              spellName: spell.pluginData.name
            }
          }
        }));
        
        // Use Promise-based correlation for all saving throw rolls
        saveResults = await context.sendMultipleRollRequests(saveRequests);
        
        // Determine saves/failures for each target
        saveSuccesses = saveResults.map((result, i) => {
          const total = result.results.reduce((sum, diceGroup) => 
            sum + diceGroup.results.reduce((groupSum, roll) => groupSum + roll, 0), 0
          );
          const saveBonus = calculateTargetSaveBonus(targets[i], saveInfo.ability);
          const finalTotal = total + saveBonus;
          const isSuccess = finalTotal >= saveInfo.dc!;
          
          console.log(`[SpellCasting] ${targets[i].name} save: ${total} + ${saveBonus} = ${finalTotal} vs DC ${saveInfo.dc} → ${isSuccess ? 'SUCCESS' : 'FAILURE'}`);
          
          // Send structured roll result to chat
          context.sendRollResult({
            message: `${targets[i].name} ${saveInfo.ability} save vs ${spell.pluginData.name}`,
            result: finalTotal,
            target: saveInfo.dc!,
            success: isSuccess,
            rollType: 'saving-throw'
          });
          
          return isSuccess;
        });
        
        const successCount = saveSuccesses.filter(success => success).length;
        console.log(`[SpellCasting] ${successCount}/${targets.length} saving throws succeeded`);
      }
    }
    
    // ==========================================
    // PHASE 3: DAMAGE APPLICATION (Data-Driven)
    // ==========================================
    if (spell.pluginData.damage) {
      console.log('[SpellCasting] Spell deals damage - processing damage application');
      
      const damageInfo = getSpellDamage(spell);
      if (!damageInfo) {
        console.warn('[SpellCasting] Spell has damage field but no damage data found');
      } else {
        // Request single damage roll for all targets (following proposal pattern)
        const damageResult = await context.sendRollRequest(request.playerId, 'spell-damage', {
          message: `${spell.pluginData.name} ${damageInfo.type} damage`,
          dice: [{ sides: parseInt(damageInfo.dice.split('d')[1]), quantity: parseInt(damageInfo.dice.split('d')[0]) }],
          metadata: {
            spellId,
            spellLevel: spellSlotLevel,
            damageType: damageInfo.type,
            spellName: spell.pluginData.name
          }
        });
        
        const totalDamage = damageResult.results.reduce((sum, diceGroup) => 
          sum + diceGroup.results.reduce((groupSum, roll) => groupSum + roll, 0), 0
        );
        
        console.log(`[SpellCasting] Rolled ${totalDamage} ${damageInfo.type} damage`);
        
        // Send structured roll result for damage
        context.sendRollResult({
          message: `${spell.pluginData.name} ${damageInfo.type} damage`,
          result: totalDamage,
          success: true, // Damage rolls are always successful
          rollType: 'spell-damage',
          damageInfo: {
            amount: totalDamage,
            type: damageInfo.type
          }
        });
        
        // Apply damage based on spell mechanics (data-driven conditional logic)
        targets.forEach((target, i) => {
          let shouldTakeDamage = true;
          let damageAmount = totalDamage;
          let reason = '';
          
          // Check attack hit requirement for attack spells
          if (spell.pluginData.attackRoll) {
            shouldTakeDamage = attackHits[i];
            reason = shouldTakeDamage ? 'attack hit' : 'attack missed';
          }
          
          // Check saving throw requirements for save spells
          if (spell.pluginData.savingThrow && shouldTakeDamage) {
            const saveInfo = getSpellSavingThrow(spell, caster);
            const savedSuccessfully = saveSuccesses[i];
            
            if (saveInfo?.effectOnSave === 'half') {
              // Half damage on successful save
              if (savedSuccessfully) {
                damageAmount = Math.floor(totalDamage / 2);
                reason = 'save succeeded (half damage)';
              } else {
                reason = 'save failed (full damage)';
              }
            } else if (saveInfo?.effectOnSave === 'none') {
              // No damage on successful save
              if (savedSuccessfully) {
                shouldTakeDamage = false;
                reason = 'save succeeded (no damage)';
              } else {
                reason = 'save failed (full damage)';
              }
            }
          }
          
          if (shouldTakeDamage && damageAmount > 0) {
            applyDamageToTarget(draft, target, damageAmount, damageInfo.type);
            console.log(`[SpellCasting] Applied ${damageAmount} ${damageInfo.type} damage to ${target.name} (${reason})`);
          } else {
            console.log(`[SpellCasting] ${target.name} takes no damage (${reason})`);
          }
        });
        
        // Send damage summary to chat (enhanced for saving throws)
        const damagedTargets: { name: string; damage: number; reason: string }[] = [];
        
        targets.forEach((target, i) => {
          let shouldTakeDamage = true;
          let damageAmount = totalDamage;
          let reason = '';
          
          // Calculate the same damage logic as above for summary
          if (spell.pluginData.attackRoll) {
            shouldTakeDamage = attackHits[i];
            reason = shouldTakeDamage ? 'hit' : 'missed';
          }
          
          if (spell.pluginData.savingThrow && shouldTakeDamage) {
            const saveInfo = getSpellSavingThrow(spell, caster);
            const savedSuccessfully = saveSuccesses[i];
            
            if (saveInfo?.effectOnSave === 'half') {
              if (savedSuccessfully) {
                damageAmount = Math.floor(totalDamage / 2);
                reason = 'saved (half)';
              } else {
                reason = 'failed save';
              }
            } else if (saveInfo?.effectOnSave === 'none') {
              if (savedSuccessfully) {
                shouldTakeDamage = false;
                reason = 'saved (no damage)';
              } else {
                reason = 'failed save';
              }
            }
          }
          
          if (shouldTakeDamage && damageAmount > 0) {
            damagedTargets.push({ name: target.name, damage: damageAmount, reason });
          }
        });
        
        if (damagedTargets.length > 0) {
          const summary = damagedTargets.map(t => `${t.name} (${t.damage} ${damageInfo.type})`).join(', ');
          await context.sendChatMessage(`${spell.pluginData.name} deals damage to: ${summary}`);
        }
      }
    }
    
    // ==========================================
    // PHASE 4: ADDITIONAL EFFECTS (Data-Driven)
    // ==========================================  
    // TODO: Implement in Phase 3.3 - Effect Application System
    // This will handle spells like Hold Person that apply conditions
    
    // Success message
    await context.sendChatMessage(`${spell.pluginData.name} cast successfully!`);
    console.log('[SpellCasting] Unified spell casting workflow completed successfully');
    
  } catch (error) {
    console.error('[SpellCasting] Error in spell casting workflow:', error);
    
    // Send error message to chat
    await context.sendChatMessage(`Spell casting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Re-throw to fail the action
    throw error;
  }
}

/**
 * Validate spell casting requirements
 * Moved from legacy cast-spell.handler for unified approach
 */
async function validateSpellCasting(
  request: GameActionRequest,
  gameState: ServerGameStateWithVirtuals
): Promise<{ valid: boolean; error?: { code: string; message: string }; resourceCosts?: Array<{ resourcePath: string; amount: number; storageType: string }> }> {
  // Find the character for this player
  const character = Object.values(gameState.documents)
    .find(doc => doc.documentType === 'character' && doc.createdBy === request.playerId);
  
  if (!character) {
    return { valid: false, error: { code: 'NO_CHARACTER', message: 'Character not found for spell casting' } };
  }

  const params = request.parameters as { 
    spellId?: string; 
    spellSlotLevel?: number;
    castingTime?: 'action' | 'bonus_action' | 'reaction' | 'ritual';
  };
  const { spellId, spellSlotLevel, castingTime = 'action' } = params;
  
  if (!spellId || typeof spellSlotLevel !== 'number') {
    return { valid: false, error: { code: 'INVALID_PARAMETERS', message: 'Missing spell ID or slot level' } };
  }

  // Skip spell slot validation for cantrips (level 0) as they don't consume spell slots
  if (spellSlotLevel > 0) {
    const spellSlots = (character.pluginData as { spellSlots?: Record<string, { total: number }> }).spellSlots;
    const maxSlots = spellSlots?.[`level${spellSlotLevel}`]?.total || 0;
    const spellSlotsUsed = (character.state?.spellSlotsUsed as Record<string, number>) || {};
    const usedSlots = spellSlotsUsed[`level${spellSlotLevel}`] || 0;

    if (usedSlots >= maxSlots) {
      return {
        valid: false,
        error: { 
          code: 'NO_SPELL_SLOTS', 
          message: `No level ${spellSlotLevel} spell slots remaining (${usedSlots}/${maxSlots} used)`
        }
      };
    }
  }
  
  // Check action economy using standardized action economy system
  const actionType = getActionTypeFromCastingTime(castingTime);
  
  if (actionType) {
    const actionValidation = await validateActionEconomy(actionType, character, gameState, 'Magic');
    if (!actionValidation.valid) {
      return actionValidation;
    }
    
    // D&D 5e bonus action spell restriction: If you cast a bonus action spell, you can only cast cantrips with your action
    if (castingTime === 'bonus_action' && spellSlotLevel > 0) {
      const turnState = character.state?.turnState;
      const actionsUsed = (turnState?.actionsUsed as string[]) || [];
      if (actionsUsed.length > 0) {
        return {
          valid: false,
          error: { code: 'BONUS_ACTION_SPELL_RESTRICTION', message: 'Cannot cast leveled spell as bonus action if action already used' }
        };
      }
    }
  }
  
  // Check conditions preventing spellcasting
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
  
  // Check spell known/prepared - handle cantrips and leveled spells differently
  if (spellSlotLevel === 0) {
    // For cantrips, check pluginData.spellcasting.cantrips array
    const cantrips = (character.pluginData as Record<string, unknown>)?.spellcasting as { cantrips?: Array<{ spell: string }> } | undefined;
    const hasCantrip = cantrips?.cantrips?.some((cantrip) => cantrip.spell === spellId) || false;
    
    if (!hasCantrip) {
      return {
        valid: false,
        error: { 
          code: 'SPELL_NOT_KNOWN', 
          message: `Character does not know cantrip: ${spellId}`
        }
      };
    }
  } else {
    // For leveled spells, check pluginData.spells known/prepared arrays
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
  }
  
  return { 
    valid: true,
    // Only report spell slot consumption for leveled spells (not cantrips)
    resourceCosts: spellSlotLevel > 0 ? [{
      resourcePath: `spellSlotsUsed.level${spellSlotLevel}`,
      amount: 1,
      storageType: 'state'
    }] : []
  };
}

/**
 * Unified spell casting action handler
 * Uses the unified spell casting handler with proper ActionHandler interface
 */
export const unifiedSpellCastHandler = {
  validate: validateSpellCasting,
  execute: executeSpellCast,
  approvalMessage: (request: GameActionRequest) => `wants to cast ${request.parameters.spellId || 'a spell'}`,
  priority: 100 // Plugin priority
};