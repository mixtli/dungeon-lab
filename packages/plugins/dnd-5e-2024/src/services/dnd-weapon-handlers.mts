import type { RollTypeHandler, RollHandlerContext } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';

/**
 * Handler for weapon attack rolls
 * Calculates attack bonus and determines hit/miss messaging
 */
export class DndWeaponAttackHandler implements RollTypeHandler {
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    console.log('[DndWeaponAttackHandler] Processing weapon attack:', {
      weaponName: result.metadata.weapon?.name,
      advantageMode: result.arguments.pluginArgs?.advantageMode,
      characterName: result.metadata.characterName,
      isGM: context.isGM
    });

    if (!context.isGM) {
      // Player client: just provide UI feedback
      console.log('[DndWeaponAttackHandler] Player client - UI feedback only');
      return;
    }

    // GM client: calculate final attack result
    const weapon = result.metadata.weapon;
    const character = result.metadata.character;
    
    if (!weapon || !character) {
      console.error('[DndWeaponAttackHandler] Missing weapon or character data');
      return;
    }

    const total = this.calculateAttackTotal(result, weapon, character);
    
    // Create attack result message
    const attackMessage = this.createAttackResultMessage(result, weapon, total);
    
    if (context.sendChatMessage) {
      context.sendChatMessage(attackMessage, {
        type: 'roll',
        rollData: {
          ...result,
          total,
          weaponName: weapon.name,
          isCriticalHit: this.isCriticalHit(result)
        },
        recipient: result.recipients
      });
      console.log('[DndWeaponAttackHandler] GM sent attack result:', { total, weapon: weapon.name });
    } else {
      console.warn('[DndWeaponAttackHandler] GM client but no sendChatMessage function available');
    }
  }

  private calculateAttackTotal(result: RollServerResult, weapon: any, character: any): number {
    let total = 0;
    
    // Handle advantage/disadvantage d20 rolls
    for (const diceGroup of result.results) {
      if (diceGroup.sides === 20 && diceGroup.results.length === 2) {
        const advantageMode = result.arguments.pluginArgs?.advantageMode;
        if (advantageMode === 'advantage') {
          total += Math.max(...diceGroup.results);
        } else if (advantageMode === 'disadvantage') {
          total += Math.min(...diceGroup.results);
        } else {
          total += diceGroup.results[0];
        }
      } else {
        total += diceGroup.results.reduce((sum, res) => sum + res, 0);
      }
    }

    // Add weapon attack bonus (ability + proficiency + enhancement)
    const attackBonus = this.calculateWeaponAttackBonus(weapon, character);
    total += attackBonus;

    // Add custom modifier from roll dialog
    total += result.arguments.customModifier || 0;

    console.log('[DndWeaponAttackHandler] Attack calculation:', {
      diceTotal: total - attackBonus - (result.arguments.customModifier || 0),
      attackBonus,
      customModifier: result.arguments.customModifier || 0,
      finalTotal: total
    });

    return total;
  }

  private calculateWeaponAttackBonus(weapon: any, character: any): number {
    let bonus = 0;
    
    // Get weapon ability (Str for melee, Dex for ranged, or Dex for finesse)
    const ability = this.getWeaponAttackAbility(weapon);
    const abilityMod = this.getAbilityModifier(character, ability);
    bonus += abilityMod;
    
    // Add proficiency if proficient
    if (this.isProficientWithWeapon(weapon, character)) {
      bonus += this.getProficiencyBonus(character);
    }
    
    // Add magical enhancement
    const enhancement = weapon.pluginData?.enhancement || 0;
    bonus += enhancement;
    
    console.log('[DndWeaponAttackHandler] Attack bonus breakdown:', {
      ability,
      abilityMod,
      proficient: this.isProficientWithWeapon(weapon, character),
      proficiencyBonus: this.getProficiencyBonus(character),
      enhancement,
      totalBonus: bonus
    });
    
    return bonus;
  }

  private isCriticalHit(result: RollServerResult): boolean {
    return result.results.some(group => 
      group.sides === 20 && group.results.includes(20)
    );
  }

  private createAttackResultMessage(result: RollServerResult, weapon: any, total: number): string {
    const characterName = result.metadata.characterName || 'Character';
    const weaponName = weapon.name || 'weapon';
    const isCrit = this.isCriticalHit(result);
    
    let message = `${characterName} attacks with ${weaponName}: **${total}**`;
    
    if (isCrit) {
      message += ' 🎯 **CRITICAL HIT!**';
    }
    
    return message;
  }

  // Helper methods for D&D calculations
  private getWeaponAttackAbility(weapon: any): string {
    const properties = weapon.pluginData?.properties || [];
    const weaponType = weapon.pluginData?.weaponType || weapon.pluginData?.category;
    
    // Finesse weapons can use Dex or Str - default to Dex for simplicity
    if (properties.includes('finesse')) {
      return 'dexterity';
    }
    
    // Ranged weapons use Dex
    if (weaponType === 'ranged' || weaponType === 'ranged-weapon') {
      return 'dexterity';
    }
    
    // Melee weapons use Str
    return 'strength';
  }

  private getAbilityModifier(character: any, ability: string): number {
    const abilityScore = character.pluginData?.abilities?.[ability]?.value || 10;
    return Math.floor((abilityScore - 10) / 2);
  }

  private isProficientWithWeapon(weapon: any, character: any): boolean {
    const weaponProficiencies = character.pluginData?.proficiencies?.weapons || [];
    const weaponCategory = weapon.pluginData?.category || weapon.pluginData?.weaponType;
    
    // Check for specific weapon proficiency or category proficiency
    return weaponProficiencies.includes(weapon.name) || 
           weaponProficiencies.includes(weaponCategory) ||
           weaponProficiencies.includes('simple-weapons') ||
           weaponProficiencies.includes('martial-weapons');
  }

  private getProficiencyBonus(character: any): number {
    const level = character.pluginData?.progression?.level || character.pluginData?.level || 1;
    return Math.ceil(level / 4) + 1; // D&D 5e proficiency progression
  }
}

/**
 * Handler for weapon damage rolls
 * Calculates damage total with ability modifier and enhancement
 */
export class DndWeaponDamageHandler implements RollTypeHandler {
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    console.log('[DndWeaponDamageHandler] Processing weapon damage:', {
      weaponName: result.metadata.weapon?.name,
      characterName: result.metadata.characterName,
      critical: result.metadata.critical,
      isGM: context.isGM
    });

    if (!context.isGM) {
      console.log('[DndWeaponDamageHandler] Player client - UI feedback only');
      return;
    }

    const weapon = result.metadata.weapon;
    const character = result.metadata.character;
    
    if (!weapon || !character) {
      console.error('[DndWeaponDamageHandler] Missing weapon or character data');
      return;
    }

    const isCritical = result.metadata.critical as boolean || false;
    const total = this.calculateDamageTotal(result, weapon, character);
    const damageType = this.getWeaponDamageType(weapon);
    
    const damageMessage = this.createDamageResultMessage(result, weapon, total, damageType, isCritical);
    
    if (context.sendChatMessage) {
      context.sendChatMessage(damageMessage, {
        type: 'roll',
        rollData: {
          ...result,
          total,
          damageType,
          isCritical,
          weaponName: weapon.name
        },
        recipient: result.recipients
      });
      console.log('[DndWeaponDamageHandler] GM sent damage result:', { 
        total, 
        damageType, 
        critical: isCritical,
        weapon: weapon.name 
      });
    }
  }

  private calculateDamageTotal(result: RollServerResult, weapon: any, character: any): number {
    let total = 0;
    
    // Sum all dice results (dice are already doubled for critical hits in roll creation)
    for (const diceGroup of result.results) {
      total += diceGroup.results.reduce((sum, res) => sum + res, 0);
    }
    
    // Add ability modifier (only once, even for critical hits)
    const ability = this.getWeaponDamageAbility(weapon);
    const abilityMod = this.getAbilityModifier(character, ability);
    total += abilityMod;
    
    // Add magical enhancement
    const enhancement = weapon.pluginData?.enhancement || 0;
    total += enhancement;
    
    // Add custom modifier
    total += result.arguments.customModifier || 0;
    
    console.log('[DndWeaponDamageHandler] Damage calculation:', {
      diceTotal: total - abilityMod - enhancement - (result.arguments.customModifier || 0),
      ability,
      abilityMod,
      enhancement,
      customModifier: result.arguments.customModifier || 0,
      finalTotal: total
    });
    
    return total;
  }

  private getWeaponDamageType(weapon: any): string {
    return weapon.pluginData?.damageType || weapon.pluginData?.damage?.type || 'bludgeoning';
  }

  private createDamageResultMessage(
    result: RollServerResult, 
    weapon: any, 
    total: number, 
    damageType: string,
    isCritical: boolean
  ): string {
    const characterName = result.metadata.characterName || 'Character';
    const weaponName = weapon.name || 'weapon';
    
    let message = `${weaponName} damage: **${total}** ${damageType}`;
    
    if (isCritical) {
      message += ' ⚡ *Critical damage*';
    }
    
    return message;
  }

  private getWeaponDamageAbility(weapon: any): string {
    // Same logic as attack ability for damage
    const properties = weapon.pluginData?.properties || [];
    const weaponType = weapon.pluginData?.weaponType || weapon.pluginData?.category;
    
    if (properties.includes('finesse')) {
      return 'dexterity';
    }
    
    if (weaponType === 'ranged' || weaponType === 'ranged-weapon') {
      return 'dexterity';
    }
    
    return 'strength';
  }

  private getAbilityModifier(character: any, ability: string): number {
    const abilityScore = character.pluginData?.abilities?.[ability]?.value || 10;
    return Math.floor((abilityScore - 10) / 2);
  }
}