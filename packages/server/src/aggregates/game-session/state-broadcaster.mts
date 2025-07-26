import type { Server } from 'socket.io';
// GameActionResult import removed - not used
import { logger } from '../../utils/logger.mjs';
import type { 
  CompleteSessionState,
  MapUpdate,
  EncounterUpdate,
  InventoryChange,
  ActionMessage,
  RuntimeSessionState
} from './types.mjs';

/**
 * Configuration for state broadcasting
 */
interface BroadcasterConfig {
  enableBatching: boolean;
  batchDelayMs: number;
  maxBatchSize: number;
  enableDeltaUpdates: boolean;
}

/**
 * Default configuration for state broadcasting
 */
const DEFAULT_CONFIG: BroadcasterConfig = {
  enableBatching: true,
  batchDelayMs: 100, // Wait 100ms to batch updates
  maxBatchSize: 50,
  enableDeltaUpdates: true
};

/**
 * Queued broadcast operation
 */
interface QueuedBroadcast {
  type: 'full_state' | 'map_update' | 'encounter_update' | 'inventory_change' | 'action_result';
  data: unknown;
  targetPlayers?: string[];
  timestamp: number;
}

/**
 * Handles state broadcasting for GameSession aggregate
 * 
 * Responsibilities:
 * - Broadcast full session state to joining players
 * - Send incremental updates to connected players
 * - Filter updates based on player permissions
 * - Batch updates for performance
 * - Handle player-specific state views
 */
export class StateBroadcaster {
  private config: BroadcasterConfig;
  private broadcastQueue: QueuedBroadcast[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor(
    private sessionId: string,
    private socketServer: Server,
    config: Partial<BroadcasterConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Broadcast complete session state to a specific player (on join)
   */
  public broadcastFullState(
    playerId: string, 
    sessionState: CompleteSessionState
  ): void {
    const room = `user:${playerId}`;
    
    // Filter state based on player permissions
    const filteredState = this.filterStateForPlayer(sessionState, playerId);
    
    this.socketServer.to(room).emit('sessionStateUpdate', {
      type: 'full_state',
      sessionId: this.sessionId,
      state: filteredState,
      version: sessionState.stateVersion,
      timestamp: Date.now()
    });

    logger.info(`Broadcasted full session state to player`, {
      sessionId: this.sessionId,
      playerId,
      stateVersion: sessionState.stateVersion
    });
  }

  /**
   * Broadcast map updates to relevant players
   */
  public broadcastMapUpdate(
    mapUpdate: MapUpdate,
    targetPlayers?: string[]
  ): void {
    if (this.config.enableBatching) {
      this.queueBroadcast({
        type: 'map_update',
        data: mapUpdate,
        targetPlayers,
        timestamp: Date.now()
      });
    } else {
      this.sendMapUpdate(mapUpdate, targetPlayers);
    }
  }

  /**
   * Broadcast encounter updates to session participants
   */
  public broadcastEncounterUpdate(
    encounterUpdate: EncounterUpdate,
    targetPlayers?: string[]
  ): void {
    if (this.config.enableBatching) {
      this.queueBroadcast({
        type: 'encounter_update',
        data: encounterUpdate,
        targetPlayers,
        timestamp: Date.now()
      });
    } else {
      this.sendEncounterUpdate(encounterUpdate, targetPlayers);
    }
  }

  /**
   * Broadcast inventory changes to character owner
   */
  public broadcastInventoryChange(
    characterId: string,
    playerId: string,
    inventoryChange: InventoryChange
  ): void {
    if (this.config.enableBatching) {
      this.queueBroadcast({
        type: 'inventory_change',
        data: { characterId, inventoryChange },
        targetPlayers: [playerId],
        timestamp: Date.now()
      });
    } else {
      this.sendInventoryChange(characterId, playerId, inventoryChange);
    }
  }

  /**
   * Broadcast action results to relevant players
   */
  public broadcastActionResult(
    actionMessage: ActionMessage,
    targetPlayers?: string[]
  ): void {
    if (!actionMessage.result) {
      return;
    }

    if (this.config.enableBatching) {
      this.queueBroadcast({
        type: 'action_result',
        data: actionMessage,
        targetPlayers,
        timestamp: Date.now()
      });
    } else {
      this.sendActionResult(actionMessage, targetPlayers);
    }
  }

  /**
   * Broadcast runtime state changes (pause, settings, etc.)
   */
  public broadcastRuntimeStateChange(
    runtimeState: Partial<RuntimeSessionState>
  ): void {
    const sessionRoom = `session:${this.sessionId}`;
    
    this.socketServer.to(sessionRoom).emit('runtimeStateUpdate', {
      sessionId: this.sessionId,
      changes: runtimeState,
      timestamp: Date.now()
    });

    logger.debug(`Broadcasted runtime state change`, {
      sessionId: this.sessionId,
      changes: Object.keys(runtimeState)
    });
  }

  /**
   * Queue a broadcast operation for batching
   */
  private queueBroadcast(broadcast: QueuedBroadcast): void {
    this.broadcastQueue.push(broadcast);
    
    if (this.broadcastQueue.length >= this.config.maxBatchSize) {
      this.flushBroadcastQueue();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBroadcastQueue();
      }, this.config.batchDelayMs);
    }
  }

  /**
   * Flush the broadcast queue and send all pending updates
   */
  private flushBroadcastQueue(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.broadcastQueue.length === 0) {
      return;
    }

    const broadcasts = [...this.broadcastQueue];
    this.broadcastQueue = [];

    // Group broadcasts by type and target for optimization
    const groupedBroadcasts = this.groupBroadcasts(broadcasts);
    
    // Send grouped broadcasts
    for (const group of groupedBroadcasts) {
      this.sendGroupedBroadcast(group);
    }

    logger.debug(`Flushed broadcast queue`, {
      sessionId: this.sessionId,
      broadcastCount: broadcasts.length,
      groupCount: groupedBroadcasts.length
    });
  }

  /**
   * Group broadcasts by type and target for batching
   */
  private groupBroadcasts(broadcasts: QueuedBroadcast[]): QueuedBroadcast[][] {
    const groups: Map<string, QueuedBroadcast[]> = new Map();
    
    for (const broadcast of broadcasts) {
      const key = `${broadcast.type}-${JSON.stringify(broadcast.targetPlayers || [])}`;
      const group = groups.get(key) || [];
      group.push(broadcast);
      groups.set(key, group);
    }
    
    return Array.from(groups.values());
  }

  /**
   * Send a grouped broadcast
   */
  private sendGroupedBroadcast(group: QueuedBroadcast[]): void {
    if (group.length === 0) return;
    
    const firstBroadcast = group[0];
    
    switch (firstBroadcast.type) {
      case 'map_update':
        // Combine map updates
        const combinedMapUpdate = this.combineMapUpdates(
          group.map(b => b.data as MapUpdate)
        );
        this.sendMapUpdate(combinedMapUpdate, firstBroadcast.targetPlayers);
        break;
        
      case 'encounter_update':
        // Combine encounter updates
        const combinedEncounterUpdate = this.combineEncounterUpdates(
          group.map(b => b.data as EncounterUpdate)
        );
        this.sendEncounterUpdate(combinedEncounterUpdate, firstBroadcast.targetPlayers);
        break;
        
      case 'action_result':
        // Send action results individually (can't be combined)
        for (const broadcast of group) {
          this.sendActionResult(
            broadcast.data as ActionMessage, 
            broadcast.targetPlayers
          );
        }
        break;
        
      case 'inventory_change':
        // Send inventory changes individually (character-specific)
        for (const broadcast of group) {
          const data = broadcast.data as { characterId: string; inventoryChange: InventoryChange };
          this.sendInventoryChange(
            data.characterId,
            broadcast.targetPlayers![0], // Should only have one target
            data.inventoryChange
          );
        }
        break;
    }
  }

  /**
   * Send map update to players
   */
  private sendMapUpdate(mapUpdate: MapUpdate, targetPlayers?: string[]): void {
    let room: string;
    
    if (targetPlayers && targetPlayers.length > 0) {
      // Send to specific players
      for (const playerId of targetPlayers) {
        this.socketServer.to(`user:${playerId}`).emit('mapUpdate', {
          sessionId: this.sessionId,
          update: mapUpdate,
          timestamp: Date.now()
        });
      }
      return;
    } else {
      // Send to all session participants
      room = `session:${this.sessionId}`;
    }
    
    this.socketServer.to(room).emit('mapUpdate', {
      sessionId: this.sessionId,
      update: mapUpdate,
      timestamp: Date.now()
    });
  }

  /**
   * Send encounter update to players
   */
  private sendEncounterUpdate(
    encounterUpdate: EncounterUpdate, 
    targetPlayers?: string[]
  ): void {
    let room: string;
    
    if (targetPlayers && targetPlayers.length > 0) {
      // Send to specific players
      for (const playerId of targetPlayers) {
        this.socketServer.to(`user:${playerId}`).emit('encounterUpdate', {
          sessionId: this.sessionId,
          update: encounterUpdate,
          timestamp: Date.now()
        });
      }
      return;
    } else {
      // Send to all session participants
      room = `session:${this.sessionId}`;
    }
    
    this.socketServer.to(room).emit('encounterUpdate', {
      sessionId: this.sessionId,
      update: encounterUpdate,
      timestamp: Date.now()
    });
  }

  /**
   * Send inventory change to character owner
   */
  private sendInventoryChange(
    characterId: string,
    playerId: string,
    inventoryChange: InventoryChange
  ): void {
    this.socketServer.to(`user:${playerId}`).emit('inventoryUpdate', {
      sessionId: this.sessionId,
      characterId,
      change: inventoryChange,
      timestamp: Date.now()
    });
  }

  /**
   * Send action result to players
   */
  private sendActionResult(
    actionMessage: ActionMessage,
    targetPlayers?: string[]
  ): void {
    let room: string;
    
    if (targetPlayers && targetPlayers.length > 0) {
      // Send to specific players
      for (const playerId of targetPlayers) {
        this.socketServer.to(`user:${playerId}`).emit('actionResult', {
          sessionId: this.sessionId,
          result: actionMessage.result,
          playerId: actionMessage.playerId,
          timestamp: Date.now()
        });
      }
      return;
    } else {
      // Send to all session participants
      room = `session:${this.sessionId}`;
    }
    
    this.socketServer.to(room).emit('actionResult', {
      sessionId: this.sessionId,
      result: actionMessage.result,
      playerId: actionMessage.playerId,
      timestamp: Date.now()
    });
  }

  /**
   * Filter session state for a specific player based on their permissions
   */
  private filterStateForPlayer(
    sessionState: CompleteSessionState,
    playerId: string
  ): CompleteSessionState {
    // Clone the state to avoid mutations
    const filteredState = { ...sessionState };
    
    // Filter based on player permissions
    if (filteredState.playerPermissions) {
      // Filter map data if player doesn't have permission
      if (filteredState.currentMap && !filteredState.playerPermissions.viewRestrictedAreas) {
        filteredState.currentMap = {
          ...filteredState.currentMap,
          revealedAreas: filteredState.playerPermissions.revealedAreas || []
        };
      }
      
      // Filter pending actions (player should only see their own)
      filteredState.pendingActions = filteredState.pendingActions.filter(
        action => action.playerId === playerId
      );
    }
    
    return filteredState;
  }

  /**
   * Combine multiple map updates into one
   */
  private combineMapUpdates(updates: MapUpdate[]): MapUpdate {
    if (updates.length === 1) {
      return updates[0];
    }
    
    const combined: MapUpdate = {
      mapId: updates[0].mapId,
      changes: {},
      revealedAreas: [],
      tokens: []
    };
    
    // Merge all changes
    for (const update of updates) {
      Object.assign(combined.changes, update.changes);
      
      if (update.revealedAreas) {
        combined.revealedAreas!.push(...update.revealedAreas);
      }
      
      if (update.tokens) {
        // Use the latest token positions (keyed by token ID)
        const tokenMap = new Map();
        combined.tokens!.forEach(token => tokenMap.set(token.id, token));
        update.tokens.forEach(token => tokenMap.set(token.id, token));
        combined.tokens = Array.from(tokenMap.values());
      }
    }
    
    return combined;
  }

  /**
   * Combine multiple encounter updates into one
   */
  private combineEncounterUpdates(updates: EncounterUpdate[]): EncounterUpdate {
    if (updates.length === 1) {
      return updates[0];
    }
    
    const combined: EncounterUpdate = {
      encounterId: updates[0].encounterId,
      changes: {},
      participants: [],
      activeEffects: []
    };
    
    // Merge all changes
    for (const update of updates) {
      Object.assign(combined.changes, update.changes);
      
      if (update.participants) {
        // Merge participants (latest wins for each participant)
        const participantMap = new Map();
        combined.participants!.forEach(p => participantMap.set(p.characterId, p));
        update.participants.forEach(p => participantMap.set(p.characterId, p));
        combined.participants = Array.from(participantMap.values());
      }
      
      if (update.activeEffects) {
        // Merge effects (latest wins for each effect)
        const effectMap = new Map();
        combined.activeEffects!.forEach(e => effectMap.set(e.id, e));
        update.activeEffects.forEach(e => effectMap.set(e.id, e));
        combined.activeEffects = Array.from(effectMap.values());
      }
    }
    
    return combined;
  }

  /**
   * Update broadcaster configuration
   */
  public updateConfig(config: Partial<BroadcasterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    
    // Flush any remaining broadcasts
    this.flushBroadcastQueue();
  }
}