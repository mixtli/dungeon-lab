/**
 * D&D 5e Initiative System
 * Handles initiative rolling, tracking, and combat order
 */

import type { CharacterData } from '@dungeon-lab/shared';
import type { DiceSystem } from './dice-system.mjs';
import type { DiceResult } from './dice-system.mjs';

export interface InitiativeResult {
  characterId: string;
  characterName: string;
  total: number;
  roll: number;
  modifier: number;
  dexterityModifier: number;
  initiativeBonus: number;
  advantage: boolean;
  disadvantage: boolean;
  timestamp: Date;
  diceResult: DiceResult;
}

export class InitiativeSystem {
  private diceSystem: DiceSystem;
  
  constructor(diceSystem: DiceSystem) {
    this.diceSystem = diceSystem;
  }
  
  /**
   * Roll initiative for a character
   */
  rollInitiative(character: CharacterData): InitiativeResult {
    const dexterityModifier = this.getAbilityModifier(character.abilities.dexterity.value);
    const initiativeBonus = this.getInitiativeBonus(character);
    
    const diceResult = this.diceSystem.roll(`1d20+${dexterityModifier + initiativeBonus}`);
    
    return {
      characterId: character.id,
      characterName: character.name,
      total: diceResult.total,
      roll: diceResult.rolls[0],
      modifier: dexterityModifier + initiativeBonus,
      dexterityModifier,
      initiativeBonus,
      advantage: false,
      disadvantage: false,
      timestamp: new Date(),
      diceResult
    };
  }
  
  /**
   * Roll initiative with advantage
   */
  rollInitiativeWithAdvantage(character: CharacterData): InitiativeResult {
    const dexterityModifier = this.getAbilityModifier(character.abilities.dexterity.value);
    const initiativeBonus = this.getInitiativeBonus(character);
    
    const diceResult = this.diceSystem.rollWithAdvantage(`1d20+${dexterityModifier + initiativeBonus}`);
    
    return {
      characterId: character.id,
      characterName: character.name,
      total: diceResult.total,
      roll: Math.max(...diceResult.rolls),
      modifier: dexterityModifier + initiativeBonus,
      dexterityModifier,
      initiativeBonus,
      advantage: true,
      disadvantage: false,
      timestamp: new Date(),
      diceResult
    };
  }
  
  /**
   * Roll initiative with disadvantage
   */
  rollInitiativeWithDisadvantage(character: CharacterData): InitiativeResult {
    const dexterityModifier = this.getAbilityModifier(character.abilities.dexterity.value);
    const initiativeBonus = this.getInitiativeBonus(character);
    
    const diceResult = this.diceSystem.rollWithDisadvantage(`1d20+${dexterityModifier + initiativeBonus}`);
    
    return {
      characterId: character.id,
      characterName: character.name,
      total: diceResult.total,
      roll: Math.min(...diceResult.rolls),
      modifier: dexterityModifier + initiativeBonus,
      dexterityModifier,
      initiativeBonus,
      advantage: false,
      disadvantage: true,
      timestamp: new Date(),
      diceResult
    };
  }
  
  /**
   * Get ability modifier from score
   */
  private getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }
  
  /**
   * Get initiative bonus from character features
   */
  private getInitiativeBonus(character: CharacterData): number {
    let bonus = 0;
    
    // Check for initiative-related features
    if (character.features) {
      // Alert feat
      if (this.hasFeature(character, 'alert')) {
        bonus += 5;
      }
      
      // Draconic Bloodline Sorcerer
      if (this.hasFeature(character, 'draconic-resilience')) {
        bonus += 1;
      }
      
      // War Magic Wizard
      if (this.hasFeature(character, 'tactical-wit')) {
        const intModifier = this.getAbilityModifier(character.abilities.intelligence.value);
        bonus += intModifier;
      }
      
      // Swashbuckler Rogue
      if (this.hasFeature(character, 'rakish-audacity')) {
        const chaModifier = this.getAbilityModifier(character.abilities.charisma.value);
        bonus += chaModifier;
      }
      
      // Gloom Stalker Ranger
      if (this.hasFeature(character, 'dread-ambusher')) {
        const wisModifier = this.getAbilityModifier(character.abilities.wisdom.value);
        bonus += wisModifier;
      }
    }
    
    return bonus;
  }
  
  /**
   * Check if character has a specific feature
   */
  private hasFeature(character: CharacterData, featureId: string): boolean {
    const allFeatures = [
      ...(character.features.classFeatures || []),
      ...(character.features.racialTraits || []),
      ...(character.features.feats || []),
      ...(character.features.customFeatures || [])
    ];
    
    return allFeatures.some(feature => 
      feature.id === featureId || 
      feature.name.toLowerCase().replace(/\\s+/g, '-') === featureId
    );
  }
  
  /**
   * Sort initiative order (highest to lowest)
   */
  sortInitiativeOrder(results: InitiativeResult[]): InitiativeResult[] {
    return results.sort((a, b) => {
      // Primary sort by total
      if (a.total !== b.total) {
        return b.total - a.total;
      }
      
      // Secondary sort by dexterity modifier
      if (a.dexterityModifier !== b.dexterityModifier) {
        return b.dexterityModifier - a.dexterityModifier;
      }
      
      // Tertiary sort by raw roll
      return b.roll - a.roll;
    });
  }
  
  /**
   * Create initiative tracker state
   */
  createInitiativeTracker(results: InitiativeResult[]): {
    currentTurn: number;
    round: number;
    order: InitiativeResult[];
    status: 'setup' | 'active' | 'finished';
  } {
    return {
      currentTurn: 0,
      round: 1,
      order: this.sortInitiativeOrder(results),
      status: 'setup'
    };
  }
  
  /**
   * Advance to next turn
   */
  nextTurn(tracker: {
    currentTurn: number;
    round: number;
    order: InitiativeResult[];
    status: string;
  }): void {
    tracker.currentTurn++;
    
    if (tracker.currentTurn >= tracker.order.length) {
      tracker.currentTurn = 0;
      tracker.round++;
    }
  }
  
  /**
   * Go to previous turn
   */
  previousTurn(tracker: {
    currentTurn: number;
    round: number;
    order: InitiativeResult[];
    status: string;
  }): void {
    tracker.currentTurn--;
    
    if (tracker.currentTurn < 0) {
      tracker.currentTurn = tracker.order.length - 1;
      tracker.round = Math.max(1, tracker.round - 1);
    }
  }
  
  /**
   * Get current turn information
   */
  getCurrentTurn(tracker: {
    currentTurn: number;
    round: number;
    order: InitiativeResult[];
    status: string;
  }): {
    character: InitiativeResult | null;
    round: number;
    turnNumber: number;
    isFirstTurn: boolean;
    isLastTurn: boolean;
  } {
    const character = tracker.order[tracker.currentTurn] || null;
    const isFirstTurn = tracker.currentTurn === 0;
    const isLastTurn = tracker.currentTurn === tracker.order.length - 1;
    
    return {
      character,
      round: tracker.round,
      turnNumber: tracker.currentTurn + 1,
      isFirstTurn,
      isLastTurn
    };
  }
  
  /**
   * Add new combatant to initiative order
   */
  addCombatant(tracker: {
    currentTurn: number;
    round: number;
    order: InitiativeResult[];
    status: string;
  }, result: InitiativeResult): void {
    tracker.order.push(result);
    tracker.order = this.sortInitiativeOrder(tracker.order);
    
    // Adjust current turn if needed
    const currentCharacter = tracker.order[tracker.currentTurn];
    if (currentCharacter) {
      const newIndex = tracker.order.findIndex(r => r.characterId === currentCharacter.characterId);
      if (newIndex !== -1) {
        tracker.currentTurn = newIndex;
      }
    }
  }
  
  /**
   * Remove combatant from initiative order
   */
  removeCombatant(tracker: {
    currentTurn: number;
    round: number;
    order: InitiativeResult[];
    status: string;
  }, characterId: string): void {
    const index = tracker.order.findIndex(r => r.characterId === characterId);
    if (index !== -1) {
      tracker.order.splice(index, 1);
      
      // Adjust current turn if needed
      if (tracker.currentTurn > index) {
        tracker.currentTurn--;
      } else if (tracker.currentTurn >= tracker.order.length) {
        tracker.currentTurn = 0;
      }
    }
  }
}