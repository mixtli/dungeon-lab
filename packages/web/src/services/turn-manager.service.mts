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
      
      // Collect document IDs for turn state lifecycle resets
      const participantDocumentIds: string[] = [];
      for (const participant of participants) {
        if (participant.actorId) {
          participantDocumentIds.push(participant.actorId);
        }
      }
      
      const operations: JsonPatchOperation[] = [
        { op: 'replace', path: '/turnManager/round', value: nextRound },
        { op: 'replace', path: '/turnManager/currentTurn', value: nextTurn },
        { op: 'replace', path: '/turnManager/participants', value: participants }
      ];
      
      // Add turn lifecycle reset patches
      try {
        const lifecyclePatches = generateLifecycleResetPatches(participantDocumentIds, 'turn');
        if (lifecyclePatches.length > 0) {
          operations.push(...lifecyclePatches);
          console.log(`[TurnManagerService] Added ${lifecyclePatches.length} turn lifecycle reset patches`);
        }
      } catch (error) {
        console.error('[TurnManagerService] Failed to generate turn lifecycle resets:', error);
        // Continue without lifecycle resets - turn advancement should still work
      }
      
      await this.gameStateStore.updateGameState(operations);
      
      const updatedTurnManager = { ...plainTurnManager, round: nextRound, currentTurn: nextTurn, participants };
      await this.plugin.onRoundStart(updatedTurnManager);
      await this.plugin.onTurnStart(participants[0], updatedTurnManager);
    } else {
      // Normal turn progression
      
      // Collect document IDs for turn state lifecycle resets
      const participantDocumentIds: string[] = [];
      for (const participant of plainTurnManager.participants) {
        if (participant.actorId) {
          participantDocumentIds.push(participant.actorId);
        }
      }
      
      const operations: JsonPatchOperation[] = [
        { op: 'replace', path: `/turnManager/participants/${turnManager.currentTurn}/hasActed`, value: true },
        { op: 'replace', path: '/turnManager/currentTurn', value: nextTurn }
      ];
      
      // Clear turnState for the participant whose turn just ended
      const currentParticipant = plainTurnManager.participants[turnManager.currentTurn];
      if (currentParticipant?.actorId) {
        operations.push({
          op: 'replace',
          path: `/documents/${currentParticipant.actorId}/state/turnState`,
          value: {}
        });
        console.log(`[TurnManagerService] Clearing turnState for participant: ${currentParticipant.actorId}`);
      }
      
      // Add turn lifecycle reset patches
      try {
        const lifecyclePatches = generateLifecycleResetPatches(participantDocumentIds, 'turn');
        if (lifecyclePatches.length > 0) {
          operations.push(...lifecyclePatches);
          console.log(`[TurnManagerService] Added ${lifecyclePatches.length} turn lifecycle reset patches`);
        }
      } catch (error) {
        console.error('[TurnManagerService] Failed to generate turn lifecycle resets:', error);
        // Continue without lifecycle resets - turn advancement should still work
      }
      
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