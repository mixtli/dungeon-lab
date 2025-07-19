/**
 * D&D 5e Combat System
 * 
 * Handles combat mechanics including attacks, damage, and actions for D&D 5e
 */

import type { AttackResult, DamageResult, CombatSystem } from '@dungeon-lab/shared/types/mechanics-registry.mjs';
import type { CharacterData, Item } from '@dungeon-lab/shared/types/game-data.mjs';
import { DnD5eDiceSystem } from './dice-system.mjs';

export class DnD5eCombatSystem implements CombatSystem {
  readonly id = 'dnd5e-combat';
  readonly name = 'D&D 5e Combat System';
  readonly description = 'D&D 5e combat mechanics and actions';
  
  private diceSystem = new DnD5eDiceSystem();
  
  /**
   * Make an attack roll
   */
  rollAttack(attacker: CharacterData, weapon: Item, target?: CharacterData): AttackResult {
    try {
      const attackBonus = this.getAttackBonus(attacker, weapon);
      const advantage = this.hasAttackAdvantage(attacker, weapon, target);
      const disadvantage = this.hasAttackDisadvantage(attacker, weapon, target);
      
      const attackRoll = this.diceSystem.rollAttack(attackBonus, advantage, disadvantage);
      
      // Determine if hit
      const targetAC = target?.combat.armorClass.total || 10;
      const hit = attackRoll.total >= targetAC;
      const critical = attackRoll.rolls.includes(20) && !disadvantage;
      const fumble = attackRoll.rolls.includes(1) && !advantage;
      
      return {
        attackerId: attacker.id,
        attackerName: attacker.name,
        targetId: target?.id,
        targetName: target?.name,
        weaponId: weapon.id,
        weaponName: weapon.name,
        attackBonus,
        roll: attackRoll.rolls[0] || 0,
        total: attackRoll.total,
        targetAC,
        hit,
        critical,
        fumble,
        advantage,
        disadvantage,
        diceResult: attackRoll,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Attack roll error:', error);
      return {
        attackerId: attacker.id,
        attackerName: attacker.name,
        targetId: target?.id,
        targetName: target?.name,
        weaponId: weapon.id,
        weaponName: weapon.name,
        attackBonus: 0,
        roll: 0,
        total: 0,
        targetAC: 10,
        hit: false,
        critical: false,
        fumble: false,
        advantage: false,
        disadvantage: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Roll damage
   */
  rollDamage(attacker: CharacterData, weapon: Item, target?: CharacterData, critical: boolean = false): DamageResult {
    try {
      const weaponStats = weapon.stats as { damage?: string; damageType?: string } || {};
      const damageExpression = weaponStats.damage || '1d4';
      const damageType = weaponStats.damageType || 'bludgeoning';
      
      // Add ability modifier
      const abilityModifier = this.getDamageAbilityModifier(attacker, weapon);
      const fullExpression = `${damageExpression}+${abilityModifier}`;
      
      const damageRoll = this.diceSystem.rollDamage(fullExpression, critical);
      
      // Apply damage resistance/immunity/vulnerability
      const finalDamage = this.applyDamageModifiers(damageRoll.total, damageType, target);
      
      return {
        attackerId: attacker.id,
        attackerName: attacker.name,
        targetId: target?.id,
        targetName: target?.name,
        weaponId: weapon.id,
        weaponName: weapon.name,
        damageExpression: fullExpression,
        damageType,
        damage: damageRoll.total,
        finalDamage,
        critical,
        diceResult: damageRoll,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Damage roll error:', error);
      return {
        attackerId: attacker.id,
        attackerName: attacker.name,
        targetId: target?.id,
        targetName: target?.name,
        weaponId: weapon.id,
        weaponName: weapon.name,
        damageExpression: '1d4',
        damageType: 'bludgeoning',
        damage: 0,
        finalDamage: 0,
        critical: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get attack bonus for weapon
   */
  private getAttackBonus(attacker: CharacterData, weapon: Item): number {
    const proficiencyBonus = this.getProficiencyBonus(attacker.level);
    const abilityModifier = this.getAttackAbilityModifier(attacker, weapon);
    const weaponBonus = this.getWeaponAttackBonus(weapon);
    const isProficient = this.isProficientWithWeapon(attacker, weapon);
    
    return abilityModifier + (isProficient ? proficiencyBonus : 0) + weaponBonus;
  }
  
  /**
   * Get ability modifier for attack
   */
  private getAttackAbilityModifier(attacker: CharacterData, weapon: Item): number {
    const weaponProperties = weapon.properties || [];
    const isFinesse = weaponProperties.some(p => p.name === 'finesse');
    const isRanged = weapon.category === 'ranged_weapon';
    
    if (isFinesse) {
      const strMod = this.getAbilityModifier(attacker.abilities.strength.value);
      const dexMod = this.getAbilityModifier(attacker.abilities.dexterity.value);
      return Math.max(strMod, dexMod);
    }
    
    if (isRanged) {
      return this.getAbilityModifier(attacker.abilities.dexterity.value);
    }
    
    return this.getAbilityModifier(attacker.abilities.strength.value);
  }
  
  /**
   * Get ability modifier for damage
   */
  private getDamageAbilityModifier(attacker: CharacterData, weapon: Item): number {
    // Same as attack modifier for most weapons
    return this.getAttackAbilityModifier(attacker, weapon);
  }
  
  /**
   * Get weapon attack bonus
   */
  private getWeaponAttackBonus(weapon: Item): number {
    const weaponStats = weapon.stats as { attackBonus?: number } || {};
    return weaponStats.attackBonus || 0;
  }
  
  /**
   * Check if proficient with weapon
   */
  private isProficientWithWeapon(attacker: CharacterData, weapon: Item): boolean {
    // This would check class proficiencies, feats, etc.
    // Simplified for now
    return true;
  }
  
  /**
   * Check for attack advantage
   */
  private hasAttackAdvantage(attacker: CharacterData, weapon: Item, target?: CharacterData): boolean {
    // Check various sources of advantage
    let advantage = false;
    
    // Hidden/invisible
    if (this.hasCondition(attacker, 'hidden') || this.hasCondition(attacker, 'invisible')) {
      advantage = true;
    }
    
    // Target is prone (melee attacks)
    if (target && this.hasCondition(target, 'prone') && this.isMeleeWeapon(weapon)) {
      advantage = true;
    }
    
    // Target is restrained
    if (target && this.hasCondition(target, 'restrained')) {
      advantage = true;
    }
    
    // Target is paralyzed
    if (target && this.hasCondition(target, 'paralyzed')) {
      advantage = true;
    }
    
    // Target is unconscious
    if (target && this.hasCondition(target, 'unconscious')) {
      advantage = true;
    }
    
    return advantage;
  }
  
  /**
   * Check for attack disadvantage
   */
  private hasAttackDisadvantage(attacker: CharacterData, weapon: Item, target?: CharacterData): boolean {
    // Check various sources of disadvantage
    let disadvantage = false;
    
    // Attacker is blinded
    if (this.hasCondition(attacker, 'blinded')) {
      disadvantage = true;
    }
    
    // Attacker is prone (ranged attacks)
    if (this.hasCondition(attacker, 'prone') && this.isRangedWeapon(weapon)) {
      disadvantage = true;
    }
    
    // Target is prone (ranged attacks)
    if (target && this.hasCondition(target, 'prone') && this.isRangedWeapon(weapon)) {
      disadvantage = true;
    }
    
    // Attacker is restrained
    if (this.hasCondition(attacker, 'restrained')) {
      disadvantage = true;
    }
    
    return disadvantage;
  }
  
  /**
   * Apply damage modifiers (resistance, immunity, vulnerability)
   */
  private applyDamageModifiers(damage: number, damageType: string, target?: CharacterData): number {
    if (!target) return damage;
    
    // Check immunities
    if (target.combat.immunities.includes(damageType)) {
      return 0;
    }
    
    // Check resistances
    if (target.combat.resistances.includes(damageType)) {
      return Math.floor(damage / 2);
    }
    
    // Check vulnerabilities
    if (target.combat.vulnerabilities.includes(damageType)) {
      return damage * 2;
    }
    
    return damage;
  }
  
  /**
   * Check if character has condition
   */
  private hasCondition(character: CharacterData, condition: string): boolean {
    // This would check active conditions on the character
    // Simplified for now
    return false;
  }
  
  /**
   * Check if weapon is melee
   */
  private isMeleeWeapon(weapon: Item): boolean {
    return weapon.category === 'melee_weapon' || weapon.category === 'weapon';
  }
  
  /**
   * Check if weapon is ranged
   */
  private isRangedWeapon(weapon: Item): boolean {
    return weapon.category === 'ranged_weapon';
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
  
  /**
   * Calculate armor class
   */
  calculateArmorClass(character: CharacterData): number {
    let baseAC = 10;
    let dexModifier = this.getAbilityModifier(character.abilities.dexterity.value);
    let armorBonus = 0;
    let shieldBonus = 0;
    let maxDexBonus = 10; // No limit by default
    
    // Check equipped armor
    const equippedArmor = this.getEquippedArmor(character);
    if (equippedArmor) {
      const armorStats = equippedArmor.stats as { ac?: number; maxDexBonus?: number } || {};
      baseAC = armorStats.ac || 10;
      maxDexBonus = armorStats.maxDexBonus !== undefined ? armorStats.maxDexBonus : 10;
    }
    
    // Check equipped shield
    const equippedShield = this.getEquippedShield(character);
    if (equippedShield) {
      const shieldStats = equippedShield.stats as { ac?: number } || {};
      shieldBonus = shieldStats.ac || 2;
    }
    
    // Apply dexterity modifier with max limit
    const effectiveDexModifier = Math.min(dexModifier, maxDexBonus);
    
    return baseAC + effectiveDexModifier + armorBonus + shieldBonus;
  }
  
  /**
   * Get equipped armor
   */
  private getEquippedArmor(character: CharacterData): Item | null {
    const equippedItems = character.inventory.equipped;
    const chestItem = equippedItems.chest;
    
    if (chestItem && chestItem.category === 'armor') {
      return chestItem;
    }
    
    return null;
  }
  
  /**
   * Get equipped shield
   */
  private getEquippedShield(character: CharacterData): Item | null {
    const equippedItems = character.inventory.equipped;
    const offHandItem = equippedItems.off_hand;
    
    if (offHandItem && offHandItem.category === 'shield') {
      return offHandItem;
    }
    
    return null;
  }
  
  /**
   * Apply healing
   */
  applyHealing(character: CharacterData, amount: number): { healed: number; newTotal: number } {
    const currentHP = character.combat.hitPoints.current;
    const maxHP = character.combat.hitPoints.maximum;
    
    const healed = Math.min(amount, maxHP - currentHP);
    const newTotal = currentHP + healed;
    
    return { healed, newTotal };
  }
  
  /**
   * Apply damage
   */
  applyDamage(character: CharacterData, amount: number): { damaged: number; newTotal: number; unconscious: boolean; dead: boolean } {
    const currentHP = character.combat.hitPoints.current;
    const maxHP = character.combat.hitPoints.maximum;
    
    const newTotal = Math.max(0, currentHP - amount);
    const damaged = currentHP - newTotal;
    
    // Check for unconsciousness and death
    const unconscious = newTotal === 0;
    const dead = newTotal === 0 && amount >= maxHP;
    
    return { damaged, newTotal, unconscious, dead };
  }
  
  /**
   * Roll death saving throw
   */
  rollDeathSave(character: CharacterData): { roll: number; success: boolean; stabilized: boolean; dead: boolean } {
    const diceResult = this.diceSystem.rollDeathSave();
    const roll = diceResult.total;
    
    const success = roll >= 10;
    const stabilized = roll === 20;
    const dead = roll === 1;
    
    return { roll, success, stabilized, dead };
  }
}