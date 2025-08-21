import type { RollTypeHandler, RollHandlerContext } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { ICharacter, IItem, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import { parseDiceExpression } from '@dungeon-lab/shared/utils/dice-parser.mjs';
import { calculateGridDistance, type GridBounds } from '@dungeon-lab/shared-ui/utils/grid-distance.mjs';
import { unref } from 'vue';
import type { DndWeaponData } from '../types/dnd/item.mjs';
import type { DndCharacterData } from '../types/dnd/character.mjs';

/**
 * Handler for weapon attack rolls
 * Calculates attack bonus and determines hit/miss messaging
 */
export class DndWeaponAttackHandler implements RollTypeHandler {
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    console.log('[DndWeaponAttackHandler] Processing weapon attack:', {
      weaponId: result.metadata.weaponId,
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
    // Look up fresh weapon and character data from game state using IDs
    const weaponId = result.metadata.weaponId as string;
    const characterId = result.metadata.characterId as string;
    
    if (!weaponId || !characterId || !context.gameState) {
      console.error('[DndWeaponAttackHandler] Missing weapon ID, character ID, or game state');
      return;
    }
    
    // Get plain game state for calculations to avoid Vue proxy issues
    const plainGameState = unref(context.gameState);
    const character = this.lookupCharacter(characterId, plainGameState);
    const weapon = this.lookupWeapon(weaponId, plainGameState);
    
    if (!weapon || !character) {
      console.error('[DndWeaponAttackHandler] Could not find weapon or character in game state', {
        weaponId,
        characterId,
        weaponFound: !!weapon,
        characterFound: !!character
      });
      return;
    }

    const total = this.calculateAttackTotal(result, weapon, character);
    const isCriticalHit = this.isCriticalHit(result);
    
    // Create attack result message
    let attackMessage = this.createAttackResultMessage(result, weapon, total);
    
    // Check for automatic attack mode
    const autoMode = result.metadata.autoMode as boolean;
    const targetTokenIds = result.metadata.targetTokenIds as string[] || [];
    
    // Handle automatic attack mode with targets
    if (autoMode && targetTokenIds.length > 0 && context.gameState) {
      console.log('[DndWeaponAttackHandler] Processing automatic attack mode:', {
        targetCount: targetTokenIds.length,
        attackTotal: total,
        isCritical: isCriticalHit
      });
      
      // Process first target (multi-target support can be added later)
      const targetTokenId = targetTokenIds[0];
      
      // Validate range/distance before checking AC (only if gameState is available)
      const rangeCheck = this.validateAttackRange(characterId, targetTokenId, weapon, context.gameState!);
      console.log('[DndWeaponAttackHandler] Range check:', rangeCheck);
      if (!rangeCheck.valid) {
        attackMessage += ` **→ ${rangeCheck.reason}**`;
        console.log('[DndWeaponAttackHandler] Attack blocked by range:', rangeCheck);
        
        // Send range validation message to player
        if (context.sendChatMessage) {
          context.sendChatMessage(attackMessage, { type: 'text', recipient: 'public' });
        }
        return;
      }
      
      // Apply disadvantage if needed (long range, adjacent ranged, etc.)
      if (rangeCheck.hasDisadvantage) {
        attackMessage += ' (disadvantage)';
        console.log('[DndWeaponAttackHandler] Attack has disadvantage due to range:', rangeCheck.disadvantageReason);
      }
      
      const targetResult = this.getTargetACFromGameState(targetTokenId, context.gameState!);
      
      if (targetResult !== null) {
        const { ac: targetAC, documentId: targetDocumentId } = targetResult;
        const isHit = total >= targetAC || isCriticalHit; // Critical hits always hit
        attackMessage += isHit ? ' **→ HIT!**' : ' **→ MISS**';
        
        console.log('[DndWeaponAttackHandler] Hit determination:', {
          targetTokenId,
          targetDocumentId,
          targetAC,
          attackTotal: total,
          isCritical: isCriticalHit,
          result: isHit ? 'HIT' : 'MISS'
        });
        
        // If hit, request damage roll from player
        if (isHit && context.requestRoll) {
          try {
            const diceExpression = (weapon.pluginData as any)?.damage?.dice || '1d8';
            const parsedDice = parseDiceExpression(diceExpression);
            
            if (!parsedDice) {
              console.error('[DndWeaponAttackHandler] Invalid dice expression:', diceExpression);
              return;
            }
            
            const playerId = result.userId; // Player ID is available in RollServerResult
            
            console.log('[DndWeaponAttackHandler] Requesting damage roll:', {
              playerId,
              weapon: weapon.name,
              dice: parsedDice.dice,
              isCritical: isCriticalHit
            });
            
            context.requestRoll(playerId, {
              requestId: `damage-${Date.now()}`,
              message: `Roll damage for ${weapon.name || 'weapon'} hit`,
              rollType: 'weapon-damage',
              dice: parsedDice.dice,
              metadata: {
                weaponId: weapon.id,
                characterId: character.id,
                targetTokenId: targetTokenId,
                isCriticalHit: isCriticalHit,
                autoMode: true
              }
            });
            
            attackMessage += ` (damage roll requested)`;
            
          } catch (error) {
            console.error('[DndWeaponAttackHandler] Failed to request damage roll:', error);
            attackMessage += ` *(Failed to request damage roll)*`;
          }
        }
      } else {
        console.warn('[DndWeaponAttackHandler] Could not determine target AC for token:', targetTokenId);
        attackMessage += ' *(Could not determine target AC)*';
      }
    }
    
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

  private calculateAttackTotal(result: RollServerResult, weapon: IItem, character: ICharacter): number {
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

  private calculateWeaponAttackBonus(weapon: IItem, character: ICharacter): number {
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
    const weaponData = weapon.pluginData as DndWeaponData;
    const enhancement = weaponData?.enchantmentBonus || 0;
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

  private createAttackResultMessage(result: RollServerResult, weapon: IItem, total: number): string {
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
  private getWeaponAttackAbility(weapon: IItem): string {
    const weaponData = weapon.pluginData as DndWeaponData;
    const properties = weaponData?.properties || [];
    const weaponType = weaponData?.type;
    
    // Finesse weapons can use Dex or Str - default to Dex for simplicity
    if (Array.isArray(properties) && properties.includes('finesse')) {
      return 'dexterity';
    }
    
    // Ranged weapons use Dex
    if (weaponType === 'ranged') {
      return 'dexterity';
    }
    
    // Melee weapons use Str
    return 'strength';
  }

  private getAbilityModifier(character: ICharacter, ability: string): number {
    const characterData = character.pluginData as DndCharacterData;
    const abilityScore = characterData?.abilities?.[ability as keyof DndCharacterData['abilities']]?.base || 10;
    return Math.floor((abilityScore - 10) / 2);
  }

  private isProficientWithWeapon(weapon: IItem, character: ICharacter): boolean {
    const characterData = character.pluginData as DndCharacterData;
    const weaponData = weapon.pluginData as DndWeaponData;
    const weaponProficiencies = characterData?.proficiencies?.weapons || [];
    const weaponCategory = weaponData?.category;
    
    // Check for specific weapon proficiency or category proficiency
    return weaponProficiencies.includes(weapon.name) || 
           weaponProficiencies.includes(weaponCategory) ||
           weaponProficiencies.includes('simple-weapons') ||
           weaponProficiencies.includes('martial-weapons');
  }

  private getProficiencyBonus(character: ICharacter): number {
    const characterData = character.pluginData as DndCharacterData;
    const level = characterData?.progression?.level || 1;
    return Math.ceil(level / 4) + 1; // D&D 5e proficiency progression
  }

  /**
   * Look up a character document by ID from game state
   */
  private lookupCharacter(characterId: string, gameState: any): ICharacter | null {
    try {
      const character = gameState.documents?.[characterId];
      if (character && character.documentType === 'character') {
        return character as ICharacter;
      }
      return null;
    } catch (error) {
      console.error('[DndWeaponHandler] Error looking up character:', error);
      return null;
    }
  }

  /**
   * Look up a weapon item by ID from game state documents
   */
  private lookupWeapon(weaponId: string, gameState: any): IItem | null {
    try {
      const weapon = gameState.documents?.[weaponId];
      if (weapon && weapon.documentType === 'item') {
        return weapon as IItem;
      }
      return null;
    } catch (error) {
      console.error('[DndWeaponHandler] Error looking up weapon:', error);
      return null;
    }
  }

  /**
   * Get target's AC from game state for automatic hit determination
   * Now expects a token ID and looks up the linked document
   */
  /**
   * Validate if an attack can be made from attacker to target based on weapon range/reach
   * 
   * @param characterId - Attacking character's document ID
   * @param targetTokenId - Target token ID
   * @param weapon - Weapon being used for attack
   * @param gameState - Current game state
   * @returns Range validation result
   */
  private validateAttackRange(
    characterId: string,
    targetTokenId: string,
    weapon: IItem,
    gameState: ServerGameStateWithVirtuals
  ): { valid: boolean; reason?: string; hasDisadvantage?: boolean; disadvantageReason?: string } {
    console.log('[DndWeaponAttackHandler] === Range Validation Debug ===');
    console.log('[DndWeaponAttackHandler] characterId:', characterId);
    console.log('[DndWeaponAttackHandler] targetTokenId:', targetTokenId);
    console.log('[DndWeaponAttackHandler] weapon.name:', weapon.name);
    console.log('[DndWeaponAttackHandler] weapon.pluginData:', JSON.stringify(weapon.pluginData, null, 2));
    
    try {
      // Find attacker token from character ID
      const attackerToken = this.findTokenByCharacterId(characterId, gameState);
      console.log('[DndWeaponAttackHandler] attackerToken found:', !!attackerToken);
      if (attackerToken) {
        console.log('[DndWeaponAttackHandler] attackerToken.id:', attackerToken.id);
        console.log('[DndWeaponAttackHandler] attackerToken.bounds:', JSON.stringify(attackerToken.bounds));
      }
      if (!attackerToken) {
        console.log('[DndWeaponAttackHandler] RESULT: attacker not found');
        return { valid: false, reason: "OUT OF RANGE (attacker not found)" };
      }
      
      // Find target token
      const targetToken = gameState.currentEncounter?.tokens?.find(t => t.id === targetTokenId);
      console.log('[DndWeaponAttackHandler] targetToken found:', !!targetToken);
      if (targetToken) {
        console.log('[DndWeaponAttackHandler] targetToken.id:', targetToken.id);
        console.log('[DndWeaponAttackHandler] targetToken.bounds:', JSON.stringify(targetToken.bounds));
      }
      if (!targetToken) {
        console.log('[DndWeaponAttackHandler] RESULT: target not found');
        return { valid: false, reason: "OUT OF RANGE (target not found)" };
      }
      
      // Get token bounds for distance calculation
      const attackerBounds = this.getTokenBounds(attackerToken);
      const targetBounds = this.getTokenBounds(targetToken);
      console.log('[DndWeaponAttackHandler] attackerBounds:', JSON.stringify(attackerBounds));
      console.log('[DndWeaponAttackHandler] targetBounds:', JSON.stringify(targetBounds));
      
      // Calculate distance in grid squares
      const distanceSquares = calculateGridDistance(attackerBounds, targetBounds);
      const distanceFeet = distanceSquares * 5; // D&D 5e: 5 feet per square
      console.log('[DndWeaponAttackHandler] distanceSquares:', distanceSquares);
      console.log('[DndWeaponAttackHandler] distanceFeet:', distanceFeet);
      
      // Get weapon properties
      const weaponData = weapon.pluginData as DndWeaponData;
      const weaponType = weaponData?.type || 'melee'; // 'melee', 'ranged', etc.
      const weaponProperties = weaponData?.properties || [];
      const weaponRange = weaponData?.range; // { normal: number, long: number } for ranged weapons
      console.log('[DndWeaponAttackHandler] weaponType:', weaponType);
      console.log('[DndWeaponAttackHandler] weaponProperties:', JSON.stringify(weaponProperties));
      console.log('[DndWeaponAttackHandler] weaponRange:', JSON.stringify(weaponRange));
      
      // Check weapon range/reach rules
      if (weaponType === 'melee') {
        console.log('[DndWeaponAttackHandler] === MELEE WEAPON VALIDATION ===');
        // Melee weapon rules
        const hasReach = weaponProperties.includes('reach');
        const maxReach = hasReach ? 10 : 5; // Reach weapons: 10ft, normal: 5ft
        console.log('[DndWeaponAttackHandler] hasReach:', hasReach);
        console.log('[DndWeaponAttackHandler] maxReach:', maxReach);
        console.log('[DndWeaponAttackHandler] distanceFeet vs maxReach:', distanceFeet, 'vs', maxReach);
        
        if (distanceFeet > maxReach) {
          const reachText = hasReach ? 'reach ' : '';
          const result = { 
            valid: false, 
            reason: `OUT OF RANGE (${distanceFeet}ft > ${reachText}${maxReach}ft)` 
          };
          console.log('[DndWeaponAttackHandler] RESULT: OUT OF RANGE:', result);
          return result;
        }
        
        // Melee weapons work fine within reach
        const result = { valid: true };
        console.log('[DndWeaponAttackHandler] RESULT: MELEE IN RANGE:', result);
        return result;
        
      } else if (weaponType === 'ranged') {
        console.log('[DndWeaponAttackHandler] === RANGED WEAPON VALIDATION ===');
        // Ranged weapon rules
        if (!weaponRange || typeof weaponRange.normal !== 'number') {
          console.warn('[DndWeaponAttackHandler] Ranged weapon missing range data:', weapon.name);
          return { valid: false, reason: "OUT OF RANGE (no range data)" };
        }
        
        const normalRange = weaponRange.normal;
        const longRange = weaponRange.long || normalRange * 4; // Default long range if not specified
        
        // Check if beyond maximum range
        if (distanceFeet > longRange) {
          return { 
            valid: false, 
            reason: `OUT OF RANGE (${distanceFeet}ft > ${longRange}ft max)` 
          };
        }
        
        // Check for disadvantage conditions
        let hasDisadvantage = false;
        let disadvantageReason = '';
        
        // Long range disadvantage
        if (distanceFeet > normalRange) {
          hasDisadvantage = true;
          disadvantageReason = `long range (${distanceFeet}ft > ${normalRange}ft)`;
        }
        
        // Adjacent target disadvantage (within 5 feet)
        if (distanceFeet <= 5) {
          hasDisadvantage = true;
          disadvantageReason = disadvantageReason 
            ? `${disadvantageReason} + adjacent target` 
            : 'adjacent target';
        }
        
        return { 
          valid: true, 
          hasDisadvantage, 
          disadvantageReason: hasDisadvantage ? disadvantageReason : undefined 
        };
        
      } else if (weaponProperties.includes('thrown')) {
        console.log('[DndWeaponAttackHandler] === THROWN WEAPON VALIDATION ===');
        // Thrown weapon (can be used as melee or ranged)
        // For now, assume thrown attack if target is beyond melee reach
        const hasReach = weaponProperties.includes('reach');
        const meleeReach = hasReach ? 10 : 5;
        console.log('[DndWeaponAttackHandler] hasReach:', hasReach);
        console.log('[DndWeaponAttackHandler] meleeReach:', meleeReach);
        console.log('[DndWeaponAttackHandler] distanceFeet vs meleeReach:', distanceFeet, 'vs', meleeReach);
        
        if (distanceFeet <= meleeReach) {
          // Within melee reach - treat as melee attack
          const result = { valid: true };
          console.log('[DndWeaponAttackHandler] RESULT: THROWN MELEE IN RANGE:', result);
          return result;
        } else {
          console.log('[DndWeaponAttackHandler] Beyond melee reach, checking thrown range...');
          // Beyond melee reach - treat as ranged/thrown attack
          if (!weaponRange || typeof weaponRange.normal !== 'number') {
            console.warn('[DndWeaponAttackHandler] Thrown weapon missing range data:', weapon.name);
            const result = { valid: false, reason: "OUT OF RANGE (no thrown range data)" };
            console.log('[DndWeaponAttackHandler] RESULT: NO THROWN RANGE DATA:', result);
            return result;
          }
          
          const normalRange = weaponRange.normal;
          const longRange = weaponRange.long || normalRange * 4;
          console.log('[DndWeaponAttackHandler] normalRange:', normalRange, 'longRange:', longRange);
          
          if (distanceFeet > longRange) {
            const result = { 
              valid: false, 
              reason: `OUT OF RANGE (${distanceFeet}ft > ${longRange}ft thrown max)` 
            };
            console.log('[DndWeaponAttackHandler] RESULT: THROWN OUT OF RANGE:', result);
            return result;
          }
          
          // Long range disadvantage for thrown attacks
          const hasDisadvantage = distanceFeet > normalRange;
          const result = { 
            valid: true, 
            hasDisadvantage, 
            disadvantageReason: hasDisadvantage ? `thrown long range (${distanceFeet}ft > ${normalRange}ft)` : undefined 
          };
          console.log('[DndWeaponAttackHandler] RESULT: THROWN IN RANGE:', result);
          return result;
        }
      }
      
      // Unknown weapon type - allow but warn
      console.warn('[DndWeaponAttackHandler] Unknown weapon type for range check:', weaponType);
      const result = { valid: true };
      console.log('[DndWeaponAttackHandler] RESULT: UNKNOWN WEAPON TYPE (ALLOWING):', result);
      return result;
      
    } catch (error) {
      console.error('[DndWeaponAttackHandler] Error validating attack range:', error);
      const result = { valid: true }; // Allow attack on error to avoid blocking gameplay
      console.log('[DndWeaponAttackHandler] RESULT: ERROR (ALLOWING):', result);
      return result;
    }
  }

  /**
   * Find a token linked to the given character ID
   */
  private findTokenByCharacterId(characterId: string, gameState: ServerGameStateWithVirtuals): any {
    return gameState.currentEncounter?.tokens?.find((token: any) => token.documentId === characterId);
  }

  /**
   * Get grid bounds from a token for distance calculation
   */
  private getTokenBounds(token: any): GridBounds {
    const bounds = token.bounds || {};
    
    // Token bounds use topLeft/bottomRight structure
    const topLeft = bounds.topLeft || { x: 0, y: 0 };
    const bottomRight = bounds.bottomRight || topLeft;
    
    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x + 1,  // +1 because coordinates are inclusive
      height: bottomRight.y - topLeft.y + 1
    };
  }

  private getTargetACFromGameState(targetTokenId: string, gameState: ServerGameStateWithVirtuals): { ac: number; documentId: string } | null {
    try {
      // Get plain, non-reactive copy for calculations - eliminates Vue proxy issues
      const plainGameState = unref(gameState);
      
      // Look up token by ID in the current encounter's token array
      const token = plainGameState.currentEncounter?.tokens?.find(t => t.id === targetTokenId);
      if (!token) {
        console.warn('[DndWeaponAttackHandler] Token not found in current encounter:', targetTokenId);
        return null;
      }
      
      // Get linked document ID from token
      const documentId = (token as any).documentId;
      if (!documentId) {
        console.warn('[DndWeaponAttackHandler] Token has no linked document:', targetTokenId);
        return null;
      }
      
      // Look up document
      const document = plainGameState.documents?.[documentId];
      if (!document) {
        console.warn('[DndWeaponAttackHandler] Document not found for token:', { targetTokenId, documentId });
        return null;
      }
      
      // Check if document is character or actor (both can have AC)
      if (!['character', 'actor'].includes(document.documentType)) {
        console.warn('[DndWeaponAttackHandler] Document is not character or actor:', { 
          targetTokenId, 
          documentId, 
          documentType: document.documentType 
        });
        return null;
      }
      
      // Extract AC from document - handle D&D stat block schema
      let ac = 10; // Default AC
      
      // Check for AC in different formats
      const pluginData = document.pluginData as any;
      
      if (pluginData) {
        // Actor format: pluginData.armorClass = {value: number, source?: string}
        if (pluginData.armorClass && typeof pluginData.armorClass === 'object' && 'value' in pluginData.armorClass) {
          ac = pluginData.armorClass.value;
        }
        // Character format: pluginData.attributes.armorClass.value
        else if (pluginData.attributes?.armorClass && typeof pluginData.attributes.armorClass === 'object' && 'value' in pluginData.attributes.armorClass) {
          ac = pluginData.attributes.armorClass.value;
        }
        // Legacy flat number format
        else if (typeof pluginData.armorClass === 'number') {
          ac = pluginData.armorClass;
        }
        // Character legacy format: attributes.armorClass as number
        else if (typeof pluginData.attributes?.armorClass === 'number') {
          ac = pluginData.attributes.armorClass;
        }
      }
      
      // State override (runtime AC changes)
      if (document.state?.armorClass && typeof document.state.armorClass === 'number') {
        ac = document.state.armorClass;
      }
      
      console.log('[DndWeaponAttackHandler] Found target AC from token→document lookup:', {
        targetTokenId,
        documentId,
        targetName: document.name,
        documentType: document.documentType,
        finalAC: ac,
        acData: {
          pluginDataAC: pluginData?.armorClass,
          attributesAC: pluginData?.attributes?.armorClass,
          stateAC: document.state?.armorClass
        }
      });
      
      return { ac: Number(ac) || 10, documentId };
      
    } catch (error) {
      console.error('[DndWeaponAttackHandler] Error getting target AC:', error);
      return null;
    }
  }
}

/**
 * Handler for weapon damage rolls
 * Calculates damage total with ability modifier and enhancement
 */
export class DndWeaponDamageHandler implements RollTypeHandler {
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    console.log('[DndWeaponDamageHandler] Processing weapon damage:', {
      weaponId: result.metadata.weaponId,
      characterName: result.metadata.characterName,
      critical: result.metadata.critical,
      isGM: context.isGM
    });

    if (!context.isGM) {
      console.log('[DndWeaponDamageHandler] Player client - UI feedback only');
      return;
    }

    // Look up fresh weapon and character data from game state
    const weaponId = result.metadata.weaponId as string;
    const characterId = result.metadata.characterId as string;
    
    if (!weaponId || !characterId || !context.gameState) {
      console.error('[DndWeaponDamageHandler] Missing weapon ID, character ID, or game state');
      return;
    }
    
    // Get plain game state for calculations to avoid Vue proxy issues
    const plainGameState = unref(context.gameState);
    const character = this.lookupCharacter(characterId, plainGameState);
    const weapon = this.lookupWeapon(weaponId, plainGameState);
    
    if (!weapon || !character) {
      console.error('[DndWeaponDamageHandler] Could not find weapon or character in game state', {
        weaponId,
        characterId,
        weaponFound: !!weapon,
        characterFound: !!character
      });
      return;
    }

    // Check both old and new metadata formats for critical hits
    const isCritical = (result.metadata.critical as boolean) || 
                      (result.metadata.isCriticalHit as boolean) || 
                      false;
    const total = this.calculateDamageTotal(result, weapon, character, isCritical);
    const damageType = this.getWeaponDamageType(weapon);
    
    // Create damage result message
    let damageMessage = this.createDamageResultMessage(result, weapon, total, damageType, isCritical);
    
    // Check for automatic damage application
    const autoMode = result.metadata.autoMode as boolean;
    const targetTokenId = result.metadata.targetTokenId as string;
    
    // Handle automatic damage application
    if (autoMode && targetTokenId && context.requestAction) {
      try {
        console.log('[DndWeaponDamageHandler] Processing automatic damage application:', {
          targetTokenId,
          damage: total,
          damageType,
          isCritical
        });
        
        await context.requestAction('dnd5e-2024:apply-damage', {
          targetTokenId: targetTokenId,
          damage: total,
          damageType,
          source: `${weapon.name || 'Weapon'} attack`
        }, {
          description: `Apply ${total} ${damageType} damage from ${weapon.name || 'weapon'}`
        });
        
        damageMessage += ` **→ Applied to target!**`;
        console.log('[DndWeaponDamageHandler] Damage applied automatically');
        
      } catch (error) {
        console.error('[DndWeaponDamageHandler] Failed to apply damage:', error);
        damageMessage += ' *(Failed to apply damage)*';
      }
    }
    
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

  private calculateDamageTotal(result: RollServerResult, weapon: IItem, character: ICharacter, isCritical: boolean = false): number {
    let diceTotal = 0;
    
    // Sum all dice results
    for (const diceGroup of result.results) {
      const groupTotal = diceGroup.results.reduce((sum, res) => sum + res, 0);
      diceTotal += groupTotal;
    }
    
    // For critical hits, double the dice results (not modifiers)
    if (isCritical) {
      diceTotal *= 2;
    }
    
    // Add ability modifier (only once, even for critical hits)
    const ability = this.getWeaponDamageAbility(weapon);
    const abilityMod = this.getAbilityModifier(character, ability);
    
    // Add magical enhancement
    const weaponData = weapon.pluginData as DndWeaponData;
    const enhancement = weaponData?.enchantmentBonus || 0;
    
    // Add custom modifier
    const customModifier = result.arguments.customModifier || 0;
    
    const total = diceTotal + abilityMod + enhancement + customModifier;
    
    console.log('[DndWeaponDamageHandler] Damage calculation:', {
      originalDiceTotal: diceTotal / (isCritical ? 2 : 1),
      isCritical,
      finalDiceTotal: diceTotal,
      ability,
      abilityMod,
      enhancement,
      customModifier,
      finalTotal: total
    });
    
    return total;
  }

  private getWeaponDamageType(weapon: IItem): string {
    const weaponData = weapon.pluginData as DndWeaponData;
    return weaponData?.damage?.type || 'bludgeoning';
  }

  private createDamageResultMessage(
    result: RollServerResult, 
    weapon: IItem, 
    total: number, 
    damageType: string,
    isCritical: boolean
  ): string {
    const weaponName = weapon.name || 'weapon';
    
    let message = `${weaponName} damage: **${total}** ${damageType}`;
    
    if (isCritical) {
      message += ' ⚡ *Critical damage*';
    }
    
    return message;
  }

  private getWeaponDamageAbility(weapon: IItem): string {
    // Same logic as attack ability for damage - use the attack handler's method
    const weaponData = weapon.pluginData as DndWeaponData;
    const properties = weaponData?.properties || [];
    const weaponType = weaponData?.type;
    
    // Finesse weapons can use Dex or Str - default to Dex for simplicity
    if (Array.isArray(properties) && properties.includes('finesse')) {
      return 'dexterity';
    }
    
    // Ranged weapons use Dex
    if (weaponType === 'ranged') {
      return 'dexterity';
    }
    
    // Melee weapons use Str
    return 'strength';
  }

  private getAbilityModifier(character: ICharacter, ability: string): number {
    const characterData = character.pluginData as DndCharacterData;
    const abilityScore = characterData?.abilities?.[ability as keyof DndCharacterData['abilities']]?.base || 10;
    return Math.floor((abilityScore - 10) / 2);
  }

  /**
   * Look up a character document by ID from game state
   */
  private lookupCharacter(characterId: string, gameState: ServerGameStateWithVirtuals): ICharacter | null {
    try {
      const character = gameState.documents?.[characterId];
      if (character && character.documentType === 'character') {
        return character as ICharacter;
      }
      return null;
    } catch (error) {
      console.error('[DndWeaponDamageHandler] Error looking up character:', error);
      return null;
    }
  }

  /**
   * Look up a weapon item by ID from game state documents
   */
  private lookupWeapon(weaponId: string, gameState: ServerGameStateWithVirtuals): IItem | null {
    try {
      const weapon = gameState.documents?.[weaponId];
      if (weapon && weapon.documentType === 'item') {
        return weapon as IItem;
      }
      return null;
    } catch (error) {
      console.error('[DndWeaponDamageHandler] Error looking up weapon:', error);
      return null;
    }
  }
}