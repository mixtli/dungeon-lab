import type { ITurnManager, ITurnParticipant } from '@dungeon-lab/shared/types/index.mjs';
import type { BaseTurnManagerPlugin } from '@dungeon-lab/shared-ui/base/base-turn-manager.mjs';
import { pluginRegistry } from './plugin-registry.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import type { JsonPatchOperation } from '@dungeon-lab/shared/types/index.mjs';
import { generateLifecycleResetPatches } from '@dungeon-lab/shared/utils/document-state-lifecycle.mjs';

export class TurnManagerService {
  private plugin: BaseTurnManagerPlugin | null = null;
  
  // Lazy-loaded store to avoid initialization order issues
  private get gameStateStore() {
    return useGameStateStore();
  }
  
  /**
   * Reset turn state for a participant at the START of their turn (D&D 5e rules)
   */
  private async resetTurnStateForParticipant(participant: ITurnParticipant): Promise<void> {
    if (!participant.actorId) return;
    
    // Generate lifecycle reset patches for this specific participant
    const lifecyclePatches = generateLifecycleResetPatches([participant.actorId], 'turn');
    
    if (lifecyclePatches.length > 0) {
      await this.gameStateStore.updateGameState(lifecyclePatches);
      console.log(`[TurnManagerService] Reset turn state for participant at turn start: ${participant.name} (${participant.actorId})`);
    }
  }
  
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
    const operations: JsonPatchOperation[] = [{
      op: 'replace',
      path: '/turnManager',
      value: turnManager
    }];
    
    await this.gameStateStore.updateGameState(operations);
    
    // Convert to plain objects for plugin compatibility
    const plainTurnManager = JSON.parse(JSON.stringify(turnManager)) as ITurnManager;
    
    // Notify plugin
    await this.plugin.onTurnOrderStart(plainTurnManager);
    
    // Reset turn state for first participant (D&D 5e: action economy resets at turn start)
    await this.resetTurnStateForParticipant(orderedParticipants[0]);
    
    await this.plugin.onTurnStart(orderedParticipants[0], plainTurnManager);
  }
  
  async nextTurn(): Promise<boolean> {
    console.log('[TurnManagerService] nextTurn called');
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
      
      const operations: JsonPatchOperation[] = [
        { op: 'replace', path: '/turnManager/round', value: nextRound },
        { op: 'replace', path: '/turnManager/currentTurn', value: nextTurn },
        { op: 'replace', path: '/turnManager/participants', value: participants }
      ];
      
      await this.gameStateStore.updateGameState(operations);
      
      const updatedTurnManager = { ...plainTurnManager, round: nextRound, currentTurn: nextTurn, participants };
      await this.plugin.onRoundStart(updatedTurnManager);
      
      // Reset turn state for first participant of new round (D&D 5e: action economy resets at turn start)
      await this.resetTurnStateForParticipant(participants[0]);
      
      await this.plugin.onTurnStart(participants[0], updatedTurnManager);
    } else {
      // Normal turn progression
      
      const operations: JsonPatchOperation[] = [
        { op: 'replace', path: `/turnManager/participants/${turnManager.currentTurn}/hasActed`, value: true },
        { op: 'replace', path: '/turnManager/currentTurn', value: nextTurn }
      ];
      
      await this.gameStateStore.updateGameState(operations);
      
      const nextParticipant = plainTurnManager.participants[nextTurn];
      const updatedTurnManager = { ...plainTurnManager, currentTurn: nextTurn };
      
      // Reset turn state for next participant (D&D 5e: action economy resets at turn start)
      await this.resetTurnStateForParticipant(nextParticipant);
      
      await this.plugin.onTurnStart(nextParticipant, updatedTurnManager);
    }
    console.log('[TurnManagerService] nextTurn completed');
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
    
    const operations: JsonPatchOperation[] = [{
      op: 'replace',
      path: '/turnManager/participants',
      value: recalculatedParticipants
    }];
    
    await this.gameStateStore.updateGameState(operations);
  }
  
  async updateParticipantOrder(participants: ITurnParticipant[]): Promise<void> {
    console.log('[TurnManagerService] updateParticipantOrder called with:', participants.map(p => ({ name: p.name, turnOrder: p.turnOrder })));
    
    if (!this.plugin) {
      console.error('[TurnManagerService] No plugin available for updateParticipantOrder');
      return;
    }
    
    // Let plugin handle the reordering logic
    const reorderedParticipants = await this.plugin.updateParticipantOrder(participants);
    console.log('[TurnManagerService] Plugin returned reordered participants:', reorderedParticipants.map(p => ({ name: p.name, turnOrder: p.turnOrder })));
    
    const operations: JsonPatchOperation[] = [{
      op: 'replace',
      path: '/turnManager/participants',
      value: reorderedParticipants  
    }];
    
    console.log('[TurnManagerService] Updating game state with operations:', operations);
    const result = await this.gameStateStore.updateGameState(operations);
    console.log('[TurnManagerService] Game state update result:', result);
  }
  
  getPlugin(): BaseTurnManagerPlugin | null {
    return this.plugin;
  }
  
  async endTurnOrder(): Promise<void> {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return;
    
    const plainTurnManager = JSON.parse(JSON.stringify(turnManager)) as ITurnManager;
    await this.plugin.onTurnOrderEnd(plainTurnManager);
    
    const operations: JsonPatchOperation[] = [{
      op: 'replace',
      path: '/turnManager',
      value: null
    }];
    
    await this.gameStateStore.updateGameState(operations);
  }
}

// Export singleton instance
export const turnManagerService = new TurnManagerService();