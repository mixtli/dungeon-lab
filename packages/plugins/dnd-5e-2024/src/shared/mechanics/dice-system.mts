/**
 * D&D 5e Dice System
 * 
 * Implements standard D&D 5e dice rolling mechanics including
 * advantage, disadvantage, and modifiers
 */

import type { DiceResult, DiceSystem } from '@dungeon-lab/shared/types/mechanics-registry.mjs';

export class DnD5eDiceSystem implements DiceSystem {
  readonly id = 'dnd5e-dice';
  readonly name = 'D&D 5e Dice System';
  readonly description = 'Standard D&D 5e dice rolling with advantage/disadvantage';
  
  /**
   * Roll dice with D&D 5e expression parsing
   */
  roll(expression: string): DiceResult {
    try {
      const result = this.parseAndRoll(expression);
      return {
        expression,
        total: result.total,
        rolls: result.rolls,
        modifier: result.modifier,
        dice: result.dice,
        advantage: result.advantage,
        disadvantage: result.disadvantage,
        critical: result.critical,
        fumble: result.fumble,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Dice roll error:', error);
      return {
        expression,
        total: 0,
        rolls: [],
        modifier: 0,
        dice: [],
        advantage: false,
        disadvantage: false,
        critical: false,
        fumble: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Roll with advantage (roll twice, take higher)
   */
  rollWithAdvantage(expression: string): DiceResult {
    const advantageExpression = this.addAdvantageToExpression(expression);
    const result = this.roll(advantageExpression);
    result.advantage = true;
    return result;
  }
  
  /**
   * Roll with disadvantage (roll twice, take lower)
   */
  rollWithDisadvantage(expression: string): DiceResult {
    const disadvantageExpression = this.addDisadvantageToExpression(expression);
    const result = this.roll(disadvantageExpression);
    result.disadvantage = true;
    return result;
  }
  
  /**
   * Parse and execute dice expression
   */
  private parseAndRoll(expression: string): {
    total: number;
    rolls: number[];
    modifier: number;
    dice: Array<{ sides: number; count: number }>;
    advantage: boolean;
    disadvantage: boolean;
    critical: boolean;
    fumble: boolean;
  } {
    // Clean expression
    const cleanExpression = expression.toLowerCase().replace(/\s+/g, '');
    
    // Check for advantage/disadvantage
    const hasAdvantage = cleanExpression.includes('adv') || cleanExpression.includes('advantage');
    const hasDisadvantage = cleanExpression.includes('dis') || cleanExpression.includes('disadvantage');
    
    // Parse dice components
    const dicePattern = /(\d+)d(\d+)/g;
    const modifierPattern = /([+-]\d+)/g;
    
    const dice: Array<{ sides: number; count: number }> = [];
    const rolls: number[] = [];
    let modifier = 0;
    
    // Extract dice
    let match;
    while ((match = dicePattern.exec(cleanExpression)) !== null) {
      const count = parseInt(match[1]);
      const sides = parseInt(match[2]);
      dice.push({ sides, count });
      
      // Roll dice
      for (let i = 0; i < count; i++) {
        let roll = Math.floor(Math.random() * sides) + 1;
        
        // Handle advantage/disadvantage for d20s
        if (sides === 20 && (hasAdvantage || hasDisadvantage)) {
          const secondRoll = Math.floor(Math.random() * sides) + 1;
          if (hasAdvantage) {
            roll = Math.max(roll, secondRoll);
          } else if (hasDisadvantage) {
            roll = Math.min(roll, secondRoll);
          }
        }
        
        rolls.push(roll);
      }
    }
    
    // Extract modifiers
    while ((match = modifierPattern.exec(cleanExpression)) !== null) {
      modifier += parseInt(match[1]);
    }
    
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
    
    // Check for critical hit/fumble (only for d20s)
    const d20Rolls = rolls.filter((_, index) => {
      const diceIndex = Math.floor(index / dice.length);
      return dice[diceIndex]?.sides === 20;
    });
    
    const critical = d20Rolls.some(roll => roll === 20);
    const fumble = d20Rolls.some(roll => roll === 1);
    
    return {
      total,
      rolls,
      modifier,
      dice,
      advantage: hasAdvantage,
      disadvantage: hasDisadvantage,
      critical,
      fumble
    };
  }
  
  /**
   * Add advantage to expression
   */
  private addAdvantageToExpression(expression: string): string {
    // Convert d20 rolls to advantage
    return expression.replace(/1d20/g, '1d20 adv');
  }
  
  /**
   * Add disadvantage to expression
   */
  private addDisadvantageToExpression(expression: string): string {
    // Convert d20 rolls to disadvantage
    return expression.replace(/1d20/g, '1d20 dis');
  }
  
  /**
   * Roll ability check
   */
  rollAbilityCheck(abilityModifier: number, advantage?: boolean, disadvantage?: boolean): DiceResult {
    let expression = `1d20+${abilityModifier}`;
    
    if (advantage) {
      return this.rollWithAdvantage(expression);
    } else if (disadvantage) {
      return this.rollWithDisadvantage(expression);
    }
    
    return this.roll(expression);
  }
  
  /**
   * Roll saving throw
   */
  rollSavingThrow(abilityModifier: number, proficiencyBonus: number, proficient: boolean, advantage?: boolean, disadvantage?: boolean): DiceResult {
    const totalBonus = abilityModifier + (proficient ? proficiencyBonus : 0);
    let expression = `1d20+${totalBonus}`;
    
    if (advantage) {
      return this.rollWithAdvantage(expression);
    } else if (disadvantage) {
      return this.rollWithDisadvantage(expression);
    }
    
    return this.roll(expression);
  }
  
  /**
   * Roll skill check
   */
  rollSkillCheck(abilityModifier: number, proficiencyBonus: number, proficiency: 'none' | 'proficient' | 'expertise' | 'half', advantage?: boolean, disadvantage?: boolean): DiceResult {
    let profBonus = 0;
    
    switch (proficiency) {
      case 'proficient':
        profBonus = proficiencyBonus;
        break;
      case 'expertise':
        profBonus = proficiencyBonus * 2;
        break;
      case 'half':
        profBonus = Math.floor(proficiencyBonus / 2);
        break;
      default:
        profBonus = 0;
    }
    
    const totalBonus = abilityModifier + profBonus;
    let expression = `1d20+${totalBonus}`;
    
    if (advantage) {
      return this.rollWithAdvantage(expression);
    } else if (disadvantage) {
      return this.rollWithDisadvantage(expression);
    }
    
    return this.roll(expression);
  }
  
  /**
   * Roll attack roll
   */
  rollAttack(attackBonus: number, advantage?: boolean, disadvantage?: boolean): DiceResult {
    let expression = `1d20+${attackBonus}`;
    
    if (advantage) {
      return this.rollWithAdvantage(expression);
    } else if (disadvantage) {
      return this.rollWithDisadvantage(expression);
    }
    
    return this.roll(expression);
  }
  
  /**
   * Roll damage
   */
  rollDamage(damageExpression: string, critical: boolean = false): DiceResult {
    let expression = damageExpression;
    
    // Double dice on critical hit
    if (critical) {
      expression = this.doubleDiceForCritical(expression);
    }
    
    const result = this.roll(expression);
    result.critical = critical;
    return result;
  }
  
  /**
   * Double dice for critical hit
   */
  private doubleDiceForCritical(expression: string): string {
    return expression.replace(/(\d+)d(\d+)/g, (match, count, sides) => {
      const doubledCount = parseInt(count) * 2;
      return `${doubledCount}d${sides}`;
    });
  }
  
  /**
   * Roll initiative
   */
  rollInitiative(dexterityModifier: number, bonus: number = 0): DiceResult {
    const totalBonus = dexterityModifier + bonus;
    return this.roll(`1d20+${totalBonus}`);
  }
  
  /**
   * Roll hit dice for healing
   */
  rollHitDice(hitDie: number, constitutionModifier: number, count: number = 1): DiceResult {
    const expression = `${count}d${hitDie}+${constitutionModifier * count}`;
    return this.roll(expression);
  }
  
  /**
   * Roll death saving throw
   */
  rollDeathSave(): DiceResult {
    const result = this.roll('1d20');
    
    // Add success/failure information
    if (result.total >= 10) {
      result.success = true;
    } else {
      result.success = false;
    }
    
    return result;
  }
}