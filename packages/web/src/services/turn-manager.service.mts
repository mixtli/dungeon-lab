import type { ITurnManager, ITurnParticipant } from '@dungeon-lab/shared/types/index.mjs';
import type { BaseTurnManagerPlugin } from '@dungeon-lab/shared-ui/base/base-turn-manager.mjs';
import { pluginRegistry } from './plugin-registry.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import type { StateOperation } from '@dungeon-lab/shared/types/index.mjs';

export class TurnManagerService {
  private plugin: BaseTurnManagerPlugin | null = null;
  private gameStateStore = useGameStateStore();
  
  async initialize(pluginId: string): Promise<void> {
    const gameSystemPlugin = pluginRegistry.getGameSystemPlugin(pluginId);
    this.plugin = gameSystemPlugin?.turnManager || null;
    
    if (!this.plugin) {
      console.warn(`No turn manager found for plugin: ${pluginId}`);
    }
  }
  
  async startTurnOrder(participants: ITurnParticipant[]): Promise<void> {
    if (!this.plugin) {
      throw new Error('Turn manager plugin not initialized');
    }
    
    // Let plugin calculate initiative and order participants  
    const orderedParticipants = await this.plugin.calculateInitiative(participants);
    
    const turnManager: ITurnManager = {
      isActive: true,
      currentTurn: 0,
      round: 1,
      participants: orderedParticipants,
      turnData: {}
    };
    
    // Update game state
    const operations: StateOperation[] = [{
      path: 'turnManager',
      operation: 'set',
      value: turnManager
    }];
    
    await this.gameStateStore.updateGameState(operations);
    
    // Convert to plain objects for plugin compatibility
    const plainTurnManager = JSON.parse(JSON.stringify(turnManager)) as ITurnManager;
    
    // Notify plugin
    await this.plugin.onTurnOrderStart(plainTurnManager);
    await this.plugin.onTurnStart(orderedParticipants[0], plainTurnManager);
  }
  
  async nextTurn(): Promise<boolean> {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return false;
    
    // Convert readonly to mutable for plugin compatibility
    const plainTurnManager = JSON.parse(JSON.stringify(turnManager)) as ITurnManager;
    
    // Mark current participant as acted
    const currentParticipant = plainTurnManager.participants[plainTurnManager.currentTurn];
    await this.plugin.onTurnEnd(currentParticipant, plainTurnManager);
    
    let nextTurn = turnManager.currentTurn + 1;
    let nextRound = turnManager.round;
    
    // Check if round is ending
    if (nextTurn >= turnManager.participants.length) {
      await this.plugin.onRoundEnd(plainTurnManager);
      
      nextTurn = 0;
      nextRound += 1;
      
      // Recalculate initiative if plugin requires it
      let participants = [...plainTurnManager.participants];
      if (this.plugin.shouldRecalculateOrderEachRound()) {
        participants = await this.plugin.calculateInitiative(participants);
      }
      
      // Reset hasActed flags for new round
      participants = participants.map(p => ({ ...p, hasActed: false }));
      
      const operations: StateOperation[] = [
        { path: 'turnManager.round', operation: 'set', value: nextRound },
        { path: 'turnManager.currentTurn', operation: 'set', value: nextTurn },
        { path: 'turnManager.participants', operation: 'set', value: participants }
      ];
      
      await this.gameStateStore.updateGameState(operations);
      
      const updatedTurnManager = { ...plainTurnManager, round: nextRound, currentTurn: nextTurn, participants };
      await this.plugin.onRoundStart(updatedTurnManager);
      await this.plugin.onTurnStart(participants[0], updatedTurnManager);
    } else {
      // Normal turn progression
      const operations: StateOperation[] = [
        { path: `turnManager.participants.${turnManager.currentTurn}.hasActed`, operation: 'set', value: true },
        { path: 'turnManager.currentTurn', operation: 'set', value: nextTurn }
      ];
      
      await this.gameStateStore.updateGameState(operations);
      
      const nextParticipant = plainTurnManager.participants[nextTurn];
      const updatedTurnManager = { ...plainTurnManager, currentTurn: nextTurn };
      await this.plugin.onTurnStart(nextParticipant, updatedTurnManager);
    }
    
    return true;
  }
  
  canPerformAction(participantId: string, actionType: string): boolean {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return false;
    
    const plainTurnManager = JSON.parse(JSON.stringify(turnManager)) as ITurnManager;
    return this.plugin.canPerformAction(participantId, actionType, plainTurnManager);
  }
  
  async recalculateInitiative(): Promise<void> {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return;
    
    // Recalculate initiative for current participants
    const plainParticipants = JSON.parse(JSON.stringify(turnManager.participants)) as ITurnParticipant[];
    const recalculatedParticipants = await this.plugin.calculateInitiative(plainParticipants);
    
    const operations: StateOperation[] = [{
      path: 'turnManager.participants',
      operation: 'set', 
      value: recalculatedParticipants
    }];
    
    await this.gameStateStore.updateGameState(operations);
  }
  
  async updateParticipantOrder(participants: ITurnParticipant[]): Promise<void> {
    if (!this.plugin) return;
    
    // Let plugin handle the reordering logic
    const reorderedParticipants = await this.plugin.updateParticipantOrder(participants);
    
    const operations: StateOperation[] = [{
      path: 'turnManager.participants',
      operation: 'set',
      value: reorderedParticipants  
    }];
    
    await this.gameStateStore.updateGameState(operations);
  }
  
  getPlugin(): BaseTurnManagerPlugin | null {
    return this.plugin;
  }
  
  async endTurnOrder(): Promise<void> {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return;
    
    const plainTurnManager = JSON.parse(JSON.stringify(turnManager)) as ITurnManager;
    await this.plugin.onTurnOrderEnd(plainTurnManager);
    
    const operations: StateOperation[] = [{
      path: 'turnManager',
      operation: 'set',
      value: null
    }];
    
    await this.gameStateStore.updateGameState(operations);
  }
}

// Export singleton instance
export const turnManagerService = new TurnManagerService();