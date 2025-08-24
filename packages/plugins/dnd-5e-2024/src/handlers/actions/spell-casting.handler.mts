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
  getSpellDamage,
  type SpellCaster,
  type SpellTarget
} from '../../services/spell-lookup.service.mjs';
import type { DndSpellDocument } from '../../types/dnd/spell.mjs';

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
      
      // Determine hits/misses for each target
      attackHits = attackResults.map((result, i) => {
        const total = result.results.reduce((sum, diceGroup) => 
          sum + diceGroup.results.reduce((groupSum, roll) => groupSum + roll, 0), 0
        );
        const attackBonus = calculateSpellAttackBonus(caster);
        const finalTotal = total + attackBonus;
        const targetAC = getTargetAC(targets[i]);
        const isHit = finalTotal >= targetAC;
        
        console.log(`[SpellCasting] Attack vs ${targets[i].name}: ${total} + ${attackBonus} = ${finalTotal} vs AC ${targetAC} → ${isHit ? 'HIT' : 'MISS'}`);
        return isHit;
      });
      
      const hitCount = attackHits.filter(hit => hit).length;
      console.log(`[SpellCasting] ${hitCount}/${targets.length} attacks hit`);
      
      // Early exit for attack-only spells that completely miss
      if (hitCount === 0 && !spell.pluginData.savingThrow && !spell.pluginData.damage) {
        await context.sendChatMessage(`${spell.pluginData.name} - All attacks missed!`);
        console.log('[SpellCasting] All attacks missed, spell completed');
        return;
      }
    }
    
    // ==========================================
    // PHASE 2: SAVING THROWS (Data-Driven)
    // ==========================================
    // TODO: Implement in Phase 3.1 - Saving Throw Implementation
    // This will handle spells like Fireball and dual-mechanic spells like Ice Knife
    
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
        
        // Apply damage based on spell mechanics
        targets.forEach((target, i) => {
          let shouldTakeDamage = true;
          
          // Check attack hit requirement for attack spells
          if (spell.pluginData.attackRoll) {
            shouldTakeDamage = attackHits[i];
          }
          
          if (shouldTakeDamage) {
            applyDamageToTarget(draft, target, totalDamage, damageInfo.type);
            console.log(`[SpellCasting] Applied ${totalDamage} ${damageInfo.type} damage to ${target.name}`);
          } else {
            console.log(`[SpellCasting] ${target.name} takes no damage (attack missed)`);
          }
        });
        
        // Send damage summary to chat
        const hitTargets = targets.filter((_, i) => !spell.pluginData.attackRoll || attackHits[i]);
        if (hitTargets.length > 0) {
          await context.sendChatMessage(
            `${spell.pluginData.name} deals ${totalDamage} ${damageInfo.type} damage to ${hitTargets.map(t => t.name).join(', ')}`
          );
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
 * Action handler wrapper for executeSpellCast
 * Provides backward compatibility with existing action handler interface
 */
export const unifiedSpellCastHandler = {
  execute: executeSpellCast,
  priority: 100, // Plugin priority
  pluginId: 'dnd-5e-2024'
};