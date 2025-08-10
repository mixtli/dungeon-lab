import { BaseTurnManagerPlugin } from '@dungeon-lab/shared-ui/base/base-turn-manager.mjs';
import type { ITurnManager, ITurnParticipant } from '@dungeon-lab/shared/types/index.mjs';

export class DnD5eTurnManager extends BaseTurnManagerPlugin {
  readonly pluginId = 'dnd-5e-2024';
  readonly name = 'D&D 5e Turn Manager';
  readonly gameSystem = 'dnd-5e-2024';
  
  // D&D-specific overrides for automatic calculation support
  supportsAutomaticCalculation(): boolean {
    return true; // D&D has dice-based initiative
  }
  
  getInitiativeButtonLabel(): string {
    return 'Roll Initiative'; // D&D-specific button text
  }
  
  // Note: Inherits allowsManualReordering() = true, so GM can still drag-and-drop after rolling
  
  async calculateInitiative(participants: ITurnParticipant[]): Promise<ITurnParticipant[]> {
    const results: ITurnParticipant[] = [];
    
    for (const participant of participants) {
      // Get actor data for Dex modifier
      const actor = await this.getActorData(participant.actorId);
      const dexModifier = this.getDexterityModifier(actor);
      
      // Roll d20 + Dex modifier
      const roll = Math.floor(Math.random() * 20) + 1;
      const initiative = roll + dexModifier;
      
      results.push({
        ...participant,
        turnOrder: initiative,
        participantData: {
          initiativeRoll: roll,
          dexterityModifier: dexModifier,
          totalInitiative: initiative
        }
      });
    }
    
    // Sort by initiative (highest first), then by Dex modifier for ties
    return results.sort((a, b) => {
      if (b.turnOrder !== a.turnOrder) {
        return b.turnOrder - a.turnOrder;
      }
      // Tie-breaker: higher Dex modifier wins
      const bDexMod = typeof b.participantData?.dexterityModifier === 'number' ? b.participantData.dexterityModifier : 0;
      const aDexMod = typeof a.participantData?.dexterityModifier === 'number' ? a.participantData.dexterityModifier : 0;
      return bDexMod - aDexMod;
    });
  }
  
  shouldRecalculateOrderEachRound(): boolean {
    return false; // D&D uses fixed initiative order
  }
  
  canChangeOrderMidScene(): boolean {
    return false; // D&D order is fixed (except for delay/ready actions)
  }
  
  canPerformAction(participantId: string, actionType: string, turnManager: ITurnManager): boolean {
    const currentParticipant = turnManager.participants[turnManager.currentTurn];
    const isCurrentTurn = currentParticipant?.id === participantId;
    
    // D&D specific action rules
    switch (actionType) {
      case 'move':
      case 'attack':
      case 'cast-spell':
      case 'dash':
      case 'dodge':
      case 'help':
      case 'hide':
      case 'search':
        return isCurrentTurn && !currentParticipant.hasActed;
        
      case 'reaction':
      case 'opportunity-attack':
        return true; // Reactions can happen on any turn
        
      case 'bonus-action':
        return isCurrentTurn; // Can use bonus action even if main action used
        
      default:
        return isCurrentTurn;
    }
  }
  
  getAvailableActions(participantId: string, turnManager: ITurnManager): string[] {
    const actions = ['move', 'attack', 'cast-spell', 'dash', 'dodge', 'help', 'hide', 'search'];
    return actions.filter(action => this.canPerformAction(participantId, action, turnManager));
  }
  
  // Lifecycle hooks for D&D specific logic
  async onTurnOrderStart(turnManager: ITurnManager): Promise<void> {
    console.log('D&D turn-based scene begins');
  }
  
  async onTurnOrderEnd(turnManager: ITurnManager): Promise<void> {
    console.log('D&D turn-based scene ends');
  }
  
  async onTurnStart(participant: ITurnParticipant, turnManager: ITurnManager): Promise<void> {
    // D&D turn start effects (e.g., ongoing damage, condition checks)
    console.log(`${participant.name}'s turn begins (Initiative: ${participant.participantData?.totalInitiative})`);
  }
  
  async onTurnEnd(participant: ITurnParticipant, turnManager: ITurnManager): Promise<void> {
    // D&D turn end effects
    console.log(`${participant.name}'s turn ends`);
  }
  
  async onRoundStart(turnManager: ITurnManager): Promise<void> {
    console.log(`Round ${turnManager.round} begins`);
  }
  
  async onRoundEnd(turnManager: ITurnManager): Promise<void> {
    // Process end-of-round effects (spell durations, conditions, etc.)
    console.log(`Round ${turnManager.round} ends`);
  }
  
  private async getActorData(actorId?: string): Promise<Record<string, unknown>> {
    // TODO: Implementation to get actor data from game state
    // For now, return a default actor with average dexterity
    return {
      abilities: {
        dexterity: {
          score: 14 // Default to +2 modifier
        }
      }
    };
  }
  
  private getDexterityModifier(actor: Record<string, unknown>): number {
    // Calculate D&D 5e Dex modifier from ability score
    const abilities = actor.abilities as Record<string, unknown> || {};
    const dexterity = abilities.dexterity as Record<string, unknown> || {};
    const dexScore = dexterity.score as number || 10;
    return Math.floor((dexScore - 10) / 2);
  }
}