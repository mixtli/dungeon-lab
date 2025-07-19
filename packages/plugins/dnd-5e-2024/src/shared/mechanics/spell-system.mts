/**
 * D&D 5e Spell System
 * Handles spell casting, spell slots, and spell effects
 */

import type { CharacterData, Spell } from '@dungeon-lab/shared';
import type { DiceSystem } from './dice-system.mjs';

export interface SpellCastingResult {
  spellId: string;
  spellName: string;
  casterId: string;
  casterName: string;
  targetId?: string;
  targetName?: string;
  castingLevel: number;
  success: boolean;
  effects?: Array<{ type: string; result: unknown; description: string }>;
  spellAttackBonus?: number;
  spellSaveDC?: number;
  error?: string;
  timestamp: Date;
}

export class SpellSystem {
  private diceSystem: DiceSystem;
  
  constructor(diceSystem: DiceSystem) {
    this.diceSystem = diceSystem;
  }
  
  /**
   * Cast a spell
   */
  castSpell(spell: Spell, caster: CharacterData, target?: CharacterData, castingLevel?: number): SpellCastingResult {
    try {
      const effectiveLevel = castingLevel || spell.level;
      
      // Check if spell can be cast
      const canCast = this.canCastSpell(spell, caster, effectiveLevel);
      if (!canCast.success) {
        return {
          spellId: spell.id,
          spellName: spell.name,
          casterId: caster.id,
          casterName: caster.name,
          targetId: target?.id,
          targetName: target?.name,
          castingLevel: effectiveLevel,
          success: false,
          error: canCast.error,
          timestamp: new Date()
        };
      }
      
      // Calculate spell attack bonus and save DC
      const spellAttackBonus = this.getSpellAttackBonus(caster);
      const spellSaveDC = this.getSpellSaveDC(caster);
      
      // Execute spell effects
      const effects = this.executeSpellEffects(spell, caster, target, effectiveLevel, spellAttackBonus, spellSaveDC);
      
      // Consume spell slot
      this.consumeSpellSlot(caster, effectiveLevel);
      
      return {
        spellId: spell.id,
        spellName: spell.name,
        casterId: caster.id,
        casterName: caster.name,
        targetId: target?.id,
        targetName: target?.name,
        castingLevel: effectiveLevel,
        success: true,
        effects,
        spellAttackBonus,
        spellSaveDC,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Spell casting error:', error);
      return {
        spellId: spell.id,
        spellName: spell.name,
        casterId: caster.id,
        casterName: caster.name,
        targetId: target?.id,
        targetName: target?.name,
        castingLevel: castingLevel || spell.level,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Check if a spell can be cast
   */
  canCastSpell(spell: Spell, caster: CharacterData, level: number): { success: boolean; error?: string } {
    // Check if character has spell slots
    if (!caster.spells) {
      return { success: false, error: 'Character cannot cast spells' };
    }
    
    // Check if spell is prepared (for prepared casters)
    if (this.isPreparedCaster(caster) && !spell.prepared) {
      return { success: false, error: 'Spell is not prepared' };
    }
    
    // Check if spell is known
    if (!this.isSpellKnown(spell, caster)) {
      return { success: false, error: 'Spell is not known' };
    }
    
    // Check spell slot availability
    const hasSlot = this.hasSpellSlot(caster, level);
    if (!hasSlot && !spell.ritual) {
      return { success: false, error: `No ${level > 0 ? level : 'cantrip'} spell slots available` };
    }
    
    return { success: true };
  }
  
  /**
   * Get spell attack bonus
   */
  getSpellAttackBonus(caster: CharacterData): number {
    const proficiencyBonus = this.getProficiencyBonus(caster.level);
    const spellcastingAbility = this.getSpellcastingAbility(caster);
    const abilityModifier = this.getAbilityModifier(caster.abilities[spellcastingAbility].value);
    
    return proficiencyBonus + abilityModifier;
  }
  
  /**
   * Get spell save DC
   */
  getSpellSaveDC(caster: CharacterData): number {
    const proficiencyBonus = this.getProficiencyBonus(caster.level);
    const spellcastingAbility = this.getSpellcastingAbility(caster);
    const abilityModifier = this.getAbilityModifier(caster.abilities[spellcastingAbility].value);
    
    return 8 + proficiencyBonus + abilityModifier;
  }
  
  /**
   * Execute spell effects
   */
  private executeSpellEffects(
    spell: Spell,
    caster: CharacterData,
    target: CharacterData | undefined,
    level: number,
    attackBonus: number,
    saveDC: number
  ): Array<{ type: string; result: unknown; description: string }> {
    const effects: Array<{ type: string; result: unknown; description: string }> = [];
    
    for (const effect of spell.effects) {
      switch (effect.type) {
        case 'damage':
          effects.push(this.executeDamageEffect(effect, caster, target, level, attackBonus, saveDC));
          break;
        case 'healing':
          effects.push(this.executeHealingEffect(effect, caster, target, level));
          break;
        case 'condition':
          effects.push(this.executeConditionEffect(effect, caster, target, level, saveDC));
          break;
        case 'utility':
          effects.push(this.executeUtilityEffect(effect, caster, target, level));
          break;
        case 'summoning':
          effects.push(this.executeSummoningEffect(effect, caster, target, level));
          break;
        default:
          effects.push({
            type: 'unknown',
            result: null,
            description: `Unknown effect type: ${effect.type}`
          });
      }
    }
    
    return effects;
  }
  
  /**
   * Execute damage effect
   */
  private executeDamageEffect(
    effect: { dice?: string; damageType?: string; savingThrow?: { ability: string; effect: string } },
    caster: CharacterData,
    target: CharacterData | undefined,
    level: number,
    attackBonus: number,
    saveDC: number
  ): { type: string; result: unknown; description: string } {
    if (!effect.dice) {
      return {
        type: 'damage',
        result: null,
        description: 'No damage dice specified'
      };
    }
    
    // Scale damage for higher levels
    const scaledDice = this.scaleDamageForLevel(effect.dice, level);
    
    // Check for saving throw
    if (effect.savingThrow && target) {
      const saveResult = this.rollSavingThrow(target, effect.savingThrow.ability, saveDC);
      const damageResult = this.diceSystem.rollDamage(scaledDice);
      
      let finalDamage = damageResult.total;
      
      if (effect.savingThrow.effect === 'half' && saveResult.success) {
        finalDamage = Math.floor(finalDamage / 2);
      } else if (effect.savingThrow.effect === 'negates' && saveResult.success) {
        finalDamage = 0;
      }
      
      return {
        type: 'damage',
        result: {
          damage: finalDamage,
          damageType: effect.damageType,
          savingThrow: saveResult,
          diceResult: damageResult
        },
        description: `${finalDamage} ${effect.damageType} damage${saveResult.success ? ' (saved)' : ''}`
      };
    } else {
      // Direct damage or attack roll
      const damageResult = this.diceSystem.rollDamage(scaledDice);
      
      return {
        type: 'damage',
        result: {
          damage: damageResult.total,
          damageType: effect.damageType,
          diceResult: damageResult
        },
        description: `${damageResult.total} ${effect.damageType} damage`
      };
    }
  }
  
  /**
   * Execute healing effect
   */
  private executeHealingEffect(
    effect: { dice?: string },
    caster: CharacterData,
    target: CharacterData | undefined,
    level: number
  ): { type: string; result: unknown; description: string } {
    if (!effect.dice) {
      return {
        type: 'healing',
        result: null,
        description: 'No healing dice specified'
      };
    }
    
    const scaledDice = this.scaleDamageForLevel(effect.dice, level);
    const healingResult = this.diceSystem.roll(scaledDice);
    
    return {
      type: 'healing',
      result: {
        healing: healingResult.total,
        diceResult: healingResult
      },
      description: `${healingResult.total} hit points restored`
    };
  }
  
  /**
   * Execute condition effect
   */
  private executeConditionEffect(
    effect: { condition?: string; duration?: string; savingThrow?: { ability: string; effect: string } },
    caster: CharacterData,
    target: CharacterData | undefined,
    level: number,
    saveDC: number
  ): { type: string; result: unknown; description: string } {
    if (!effect.condition) {
      return {
        type: 'condition',
        result: null,
        description: 'No condition specified'
      };
    }
    
    let applied = true;
    let saveResult;
    
    if (effect.savingThrow && target) {
      saveResult = this.rollSavingThrow(target, effect.savingThrow.ability, saveDC);
      if (effect.savingThrow.effect === 'negates' && saveResult.success) {
        applied = false;
      }
    }
    
    return {
      type: 'condition',
      result: {
        condition: effect.condition,
        duration: effect.duration,
        applied,
        savingThrow: saveResult
      },
      description: applied 
        ? `${effect.condition} condition applied${effect.duration ? ` for ${effect.duration}` : ''}`
        : `${effect.condition} condition resisted`
    };
  }
  
  /**
   * Execute utility effect
   */
  private executeUtilityEffect(
    effect: Record<string, unknown>,
    caster: CharacterData,
    target: CharacterData | undefined,
    level: number
  ): { type: string; result: unknown; description: string } {
    return {
      type: 'utility',
      result: effect,
      description: 'Utility effect applied'
    };
  }
  
  /**
   * Execute summoning effect
   */
  private executeSummoningEffect(
    effect: Record<string, unknown>,
    caster: CharacterData,
    target: CharacterData | undefined,
    level: number
  ): { type: string; result: unknown; description: string } {
    return {
      type: 'summoning',
      result: effect,
      description: 'Creature summoned'
    };
  }
  
  /**
   * Roll saving throw
   */
  private rollSavingThrow(character: CharacterData, ability: string, dc: number): { roll: number; total: number; success: boolean } {
    const abilityModifier = this.getAbilityModifier(character.abilities[ability].value);
    const proficiencyBonus = this.getProficiencyBonus(character.level);
    const isProficient = character.combat.savingThrows[ability]?.proficient || false;
    
    const bonus = abilityModifier + (isProficient ? proficiencyBonus : 0);
    const diceResult = this.diceSystem.roll(`1d20+${bonus}`);
    
    return {
      roll: diceResult.rolls[0] || 0,
      total: diceResult.total,
      success: diceResult.total >= dc
    };
  }
  
  /**
   * Scale damage for higher spell levels
   */
  private scaleDamageForLevel(baseDice: string, level: number): string {
    // This is a simplified scaling system
    // In a full implementation, this would be spell-specific
    if (level <= 1) return baseDice;
    
    const extraLevels = level - 1;
    const match = baseDice.match(/(\d+)d(\d+)/);
    
    if (match) {
      const baseCount = parseInt(match[1]);
      const sides = match[2];
      const scaledCount = baseCount + extraLevels;
      return baseDice.replace(/\d+d/, `${scaledCount}d`);
    }
    
    return baseDice;
  }
  
  /**
   * Check if character has spell slot
   */
  private hasSpellSlot(character: CharacterData, level: number): boolean {
    if (!character.spells) return false;
    
    const slot = character.spells.slots[level];
    return slot && slot.available > 0;
  }
  
  /**
   * Consume spell slot
   */
  private consumeSpellSlot(character: CharacterData, level: number): void {
    if (!character.spells) return;
    
    const slot = character.spells.slots[level];
    if (slot && slot.available > 0) {
      slot.used++;
      slot.available--;
    }
  }
  
  /**
   * Check if character is a prepared caster
   */
  private isPreparedCaster(character: CharacterData): boolean {
    const preparedCasterClasses = ['cleric', 'druid', 'paladin', 'wizard'];
    return character.classes.some(cls => 
      preparedCasterClasses.includes(cls.name.toLowerCase())
    );
  }
  
  /**
   * Check if spell is known
   */
  private isSpellKnown(spell: Spell, character: CharacterData): boolean {
    if (!character.spells) return false;
    
    const spellLevel = spell.level;
    const knownSpells = character.spells.spells[spellLevel] || [];
    
    return knownSpells.some(knownSpell => knownSpell.id === spell.id);
  }
  
  /**
   * Get spellcasting ability
   */
  private getSpellcastingAbility(character: CharacterData): string {
    // This would be determined by class
    const primaryClass = character.classes[0]?.name.toLowerCase();
    
    const spellcastingAbilities: Record<string, string> = {
      cleric: 'wisdom',
      druid: 'wisdom',
      paladin: 'charisma',
      ranger: 'wisdom',
      sorcerer: 'charisma',
      warlock: 'charisma',
      wizard: 'intelligence',
      artificer: 'intelligence',
      bard: 'charisma'
    };
    
    return spellcastingAbilities[primaryClass] || 'intelligence';
  }
  
  /**
   * Get ability modifier
   */
  private getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }
  
  /**
   * Get proficiency bonus
   */
  private getProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
  }
}