import type { Server } from 'socket.io';
import { BaseAggregate, type DomainEvent, AggregateValidationError } from '../base.aggregate.mjs';
import { GMDisconnectionHandler } from './gm-disconnection-handler.mjs';
import { ActionProcessor } from './action-processor.mjs';
import { StateBroadcaster } from './state-broadcaster.mjs';
// GameSessionModel import removed - not used in aggregate
import { logger } from '../../utils/logger.mjs';
import type {
  GameActionRequest
} from '@dungeon-lab/shared/schemas/socket/actions.mjs';
import type {
  GMConnectionStatus
} from '@dungeon-lab/shared/schemas/socket/gm-authority.mjs';
import type {
  CompleteSessionState,
  SessionSettings,
  RuntimeSessionState,
  ActionMessage,
  PlayerConnection,
  MapUpdate,
  EncounterUpdate
} from './types.mjs';

/**
 * Domain events for GameSession aggregate
 */
export interface GameSessionCreatedEvent extends DomainEvent {
  eventType: 'GameSessionCreated';
  payload: {
    campaignId: string;
    gmId: string;
    sessionName: string;
  };
}

export interface PlayerJoinedSessionEvent extends DomainEvent {
  eventType: 'PlayerJoinedSession';
  payload: {
    playerId: string;
    characterId?: string;
  };
}

export interface PlayerLeftSessionEvent extends DomainEvent {
  eventType: 'PlayerLeftSession';
  payload: {
    playerId: string;
    characterIds: string[];
  };
}

export interface GMDisconnectedEvent extends DomainEvent {
  eventType: 'GMDisconnected';
  payload: {
    gmId: string;
    disconnectedAt: number;
    queuedActionCount: number;
  };
}

export interface GMReconnectedEvent extends DomainEvent {
  eventType: 'GMReconnected';
  payload: {
    gmId: string;
    reconnectedAt: number;
    processedActionCount: number;
  };
}

export interface ActionProcessedEvent extends DomainEvent {
  eventType: 'ActionProcessed';
  payload: {
    actionId: string;
    playerId: string;
    actionType: string;
    success: boolean;
  };
}

export interface SessionStateUpdatedEvent extends DomainEvent {
  eventType: 'SessionStateUpdated';
  payload: {
    stateVersion: string;
    updatedFields: string[];
  };
}

/**
 * GameSession aggregate configuration
 */
interface GameSessionConfig {
  enableHeartbeatMonitoring: boolean;
  heartbeatIntervalMs: number;
  enableActionQueuing: boolean;
  enableStateBroadcasting: boolean;
  maxConcurrentPlayers: number;
}

/**
 * Default configuration for GameSession aggregate
 */
const DEFAULT_CONFIG: GameSessionConfig = {
  enableHeartbeatMonitoring: true,
  heartbeatIntervalMs: 5000,
  enableActionQueuing: true,
  enableStateBroadcasting: true,
  maxConcurrentPlayers: 8
};

/**
 * GameSession Aggregate
 * 
 * The main aggregate for managing game session state and behavior.
 * Orchestrates GM disconnection handling, action processing, and state broadcasting.
 * 
 * Responsibilities:
 * - Maintain complete session state
 * - Handle player joins/leaves
 * - Process game actions through plugins
 * - Manage GM disconnection scenarios
 * - Broadcast state changes to clients
 * - Validate session invariants
 */
export class GameSessionAggregate extends BaseAggregate {
  private sessionState: CompleteSessionState;
  private runtimeState: RuntimeSessionState;
  private connectedPlayers: Map<string, PlayerConnection> = new Map();
  private config: GameSessionConfig;
  
  // Component handlers
  private gmDisconnectionHandler: GMDisconnectionHandler;
  private actionProcessor: ActionProcessor;
  private stateBroadcaster: StateBroadcaster;
  
  // Timers
  private heartbeatTimer?: NodeJS.Timeout;
  private stateVersion: number = 0;

  constructor(
    sessionId: string,
    initialState: CompleteSessionState,
    socketServer: Server,
    config: Partial<GameSessionConfig> = {}
  ) {
    super(sessionId);
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionState = initialState;
    this.runtimeState = {
      playerRole: 'player', // Will be updated per connection
      sessionPhase: 'lobby',
      isPaused: initialState.sessionSettings.isPaused || false,
      allowPlayerActions: initialState.sessionSettings.allowPlayerActions || true,
      voiceChatEnabled: initialState.sessionSettings.voiceChatEnabled || false,
      textChatEnabled: initialState.sessionSettings.textChatEnabled || true,
      pluginRuntimeData: {}
    };
    
    // Initialize component handlers
    this.gmDisconnectionHandler = new GMDisconnectionHandler(sessionId);
    this.actionProcessor = new ActionProcessor(sessionId);
    this.stateBroadcaster = new StateBroadcaster(sessionId, socketServer);
    
    // Start heartbeat monitoring if enabled
    if (this.config.enableHeartbeatMonitoring) {
      this.startHeartbeatMonitoring();
    }
    
    logger.info(`GameSession aggregate initialized`, {
      sessionId,
      campaignId: initialState.campaign.id,
      playersConnected: initialState.connectedPlayers.length
    });
  }

  /**
   * Handle player joining the session
   */
  public async joinSession(
    playerId: string, 
    characterId?: string
  ): Promise<CompleteSessionState> {
    this.ensureRequired(playerId, 'playerId');
    
    // Check session capacity
    if (this.connectedPlayers.size >= this.config.maxConcurrentPlayers) {
      throw new AggregateValidationError(
        'Session is at maximum capacity',
        'GameSessionAggregate',
        'maxConcurrentPlayers'
      );
    }
    
    // Add player connection
    const playerConnection: PlayerConnection = {
      userId: playerId,
      socketId: '', // Will be set by socket handler
      role: playerId === this.sessionState.campaign.gmId ? 'gm' : 'player',
      characterIds: characterId ? [characterId] : [],
      connectedAt: Date.now(),
      lastHeartbeat: Date.now()
    };
    
    this.connectedPlayers.set(playerId, playerConnection);
    
    // Update session state
    if (!this.sessionState.connectedPlayers.includes(playerId)) {
      this.sessionState.connectedPlayers.push(playerId);
    }
    
    // If character provided, add to session
    if (characterId && !this.sessionState.characters.some(c => c.id === characterId)) {
      // Note: In real implementation, would load character from database
      // For now, assume character is already in the session
      logger.warn(`Character ${characterId} not found in session characters`);
    }
    
    // Create and apply domain event
    const event = this.createEvent('PlayerJoinedSession', {
      playerId,
      characterId
    }) as PlayerJoinedSessionEvent;
    
    this.applyEvent(event);
    
    // Update state version and broadcast
    this.updateStateVersion();
    
    if (this.config.enableStateBroadcasting) {
      // Send full state to joining player
      this.stateBroadcaster.broadcastFullState(playerId, this.sessionState);
      
      // Notify other players
      // Note: This would typically be handled by the socket layer
    }
    
    logger.info(`Player ${playerId} joined session`, {
      sessionId: this.id,
      characterId,
      isGM: playerConnection.role === 'gm',
      totalPlayers: this.connectedPlayers.size
    });
    
    return this.getSessionStateForPlayer(playerId);
  }

  /**
   * Handle player leaving the session
   */
  public async leaveSession(playerId: string): Promise<void> {
    const playerConnection = this.connectedPlayers.get(playerId);
    if (!playerConnection) {
      logger.warn(`Attempted to remove non-existent player ${playerId} from session ${this.id}`);
      return;
    }
    
    // Remove player connection
    this.connectedPlayers.delete(playerId);
    
    // Update session state
    this.sessionState.connectedPlayers = this.sessionState.connectedPlayers
      .filter(id => id !== playerId);
    
    // Get character IDs for this player
    const characterIds = playerConnection.characterIds;
    
    // Create and apply domain event
    const event = this.createEvent('PlayerLeftSession', {
      playerId,
      characterIds
    }) as PlayerLeftSessionEvent;
    
    this.applyEvent(event);
    
    // Update state version
    this.updateStateVersion();
    
    logger.info(`Player ${playerId} left session`, {
      sessionId: this.id,
      characterIds,
      remainingPlayers: this.connectedPlayers.size
    });
  }

  /**
   * Process a game action request
   */
  public async processAction(
    action: GameActionRequest,
    playerId: string
  ): Promise<ActionMessage> {
    this.ensureRequired(action.actionId, 'actionId');
    this.ensureRequired(action.actionType, 'actionType');
    this.ensureRequired(action.pluginId, 'pluginId');
    
    const playerConnection = this.connectedPlayers.get(playerId);
    if (!playerConnection) {
      throw new AggregateValidationError(
        'Player not connected to session',
        'GameSessionAggregate',
        'playerId'
      );
    }
    
    // Create action context
    const context = {
      playerId,
      sessionId: this.id,
      isPlayerTurn: this.isPlayerTurn(playerId),
      sessionSettings: this.sessionState.sessionSettings,
      playerPermissions: this.sessionState.playerPermissions || {}
    };
    
    // If GM is disconnected, queue the action
    if (!this.gmDisconnectionHandler.isGMConnected()) {
      const queuedAction = this.gmDisconnectionHandler.queueAction(action, playerId);
      if (queuedAction) {
        logger.info(`Action queued due to GM disconnection`, {
          sessionId: this.id,
          playerId,
          actionType: action.actionType
        });
        return queuedAction;
      } else {
        throw new AggregateValidationError(
          'Unable to queue action - queue may be full',
          'GameSessionAggregate',
          'actionQueue'
        );
      }
    }
    
    // Process action normally
    const actionMessage = await this.actionProcessor.processAction(action, context);
    
    // Create domain event if action was processed
    if (actionMessage.status === 'completed' || actionMessage.status === 'rejected') {
      const event = this.createEvent('ActionProcessed', {
        actionId: action.actionId,
        playerId,
        actionType: action.actionType,
        success: actionMessage.result?.success || false
      }) as ActionProcessedEvent;
      
      this.applyEvent(event);
    }
    
    // Update state version and broadcast result
    this.updateStateVersion();
    
    if (this.config.enableStateBroadcasting && actionMessage.result) {
      this.stateBroadcaster.broadcastActionResult(actionMessage);
    }
    
    return actionMessage;
  }

  /**
   * Handle GM heartbeat
   */
  public handleGMHeartbeat(gmId: string): void {
    const wasConnected = this.gmDisconnectionHandler.isGMConnected();
    this.gmDisconnectionHandler.handleHeartbeat(gmId);
    
    // If GM just reconnected, process queued actions
    if (!wasConnected && this.gmDisconnectionHandler.isGMConnected()) {
      this.processQueuedActions(gmId);
    }
    
    // Update GM connection in player connections
    const gmConnection = this.connectedPlayers.get(gmId);
    if (gmConnection) {
      gmConnection.lastHeartbeat = Date.now();
    }
  }

  /**
   * Update session settings
   */
  public updateSessionSettings(settings: Partial<SessionSettings>): void {
    this.sessionState.sessionSettings = {
      ...this.sessionState.sessionSettings,
      ...settings
    };
    
    // Update runtime state
    if (settings.isPaused !== undefined) {
      this.runtimeState.isPaused = settings.isPaused;
    }
    if (settings.allowPlayerActions !== undefined) {
      this.runtimeState.allowPlayerActions = settings.allowPlayerActions;
    }
    if (settings.voiceChatEnabled !== undefined) {
      this.runtimeState.voiceChatEnabled = settings.voiceChatEnabled;
    }
    if (settings.textChatEnabled !== undefined) {
      this.runtimeState.textChatEnabled = settings.textChatEnabled;
    }
    
    // Create domain event
    const event = this.createEvent('SessionStateUpdated', {
      stateVersion: this.generateStateVersion(),
      updatedFields: Object.keys(settings)
    }) as SessionStateUpdatedEvent;
    
    this.applyEvent(event);
    
    // Update state version and broadcast
    this.updateStateVersion();
    
    if (this.config.enableStateBroadcasting) {
      this.stateBroadcaster.broadcastRuntimeStateChange(this.runtimeState);
    }
  }

  /**
   * Update map state
   */
  public updateMapState(mapUpdate: MapUpdate, targetPlayers?: string[]): void {
    if (this.sessionState.currentMap?.mapId === mapUpdate.mapId) {
      // Apply changes to current map
      Object.assign(this.sessionState.currentMap, mapUpdate.changes);
      
      if (mapUpdate.revealedAreas) {
        this.sessionState.currentMap.revealedAreas = mapUpdate.revealedAreas;
      }
      
      if (mapUpdate.tokens) {
        this.sessionState.currentMap.tokens = mapUpdate.tokens;
      }
      
      this.updateStateVersion();
      
      if (this.config.enableStateBroadcasting) {
        this.stateBroadcaster.broadcastMapUpdate(mapUpdate, targetPlayers);
      }
    }
  }

  /**
   * Update encounter state
   */
  public updateEncounterState(
    encounterUpdate: EncounterUpdate, 
    targetPlayers?: string[]
  ): void {
    if (this.sessionState.activeEncounter?.encounterId === encounterUpdate.encounterId) {
      // Apply changes to active encounter
      Object.assign(this.sessionState.activeEncounter, encounterUpdate.changes);
      
      if (encounterUpdate.participants) {
        this.sessionState.activeEncounter.playerCharacters = encounterUpdate.participants;
      }
      
      if (encounterUpdate.activeEffects) {
        this.sessionState.activeEncounter.activeEffects = encounterUpdate.activeEffects;
      }
      
      this.updateStateVersion();
      
      if (this.config.enableStateBroadcasting) {
        this.stateBroadcaster.broadcastEncounterUpdate(encounterUpdate, targetPlayers);
      }
    }
  }

  /**
   * Get current session state for a specific player
   */
  public getSessionStateForPlayer(playerId: string): CompleteSessionState {
    // Filter state based on player permissions
    const filteredState = { ...this.sessionState };
    
    // Apply player-specific filtering
    const playerConnection = this.connectedPlayers.get(playerId);
    if (playerConnection?.role !== 'gm') {
      // Filter pending actions to only show player's own actions
      filteredState.pendingActions = filteredState.pendingActions
        .filter(action => action.playerId === playerId);
    }
    
    return filteredState;
  }

  /**
   * Get GM connection status
   */
  public getGMConnectionStatus(): GMConnectionStatus {
    return this.gmDisconnectionHandler.getConnectionStatus();
  }

  /**
   * Get runtime session state
   */
  public getRuntimeState(): RuntimeSessionState {
    return { ...this.runtimeState };
  }

  /**
   * Apply domain event to aggregate state
   */
  protected apply(event: DomainEvent): void {
    switch (event.eventType) {
      case 'PlayerJoinedSession':
        // State already updated in joinSession method
        break;
        
      case 'PlayerLeftSession':
        // State already updated in leaveSession method
        break;
        
      case 'ActionProcessed':
        // Action processing state handled by ActionProcessor
        break;
        
      case 'SessionStateUpdated':
        // State already updated in update methods
        break;
        
      case 'GMDisconnected': {
        const disconnectedPayload = event.payload as GMDisconnectedEvent['payload'];
        logger.warn(`GM disconnected from session ${this.id}`, disconnectedPayload);
        break;
      }
        
      case 'GMReconnected': {
        const reconnectedPayload = event.payload as GMReconnectedEvent['payload'];
        logger.info(`GM reconnected to session ${this.id}`, reconnectedPayload);
        break;
      }
        
      default:
        logger.warn(`Unknown event type: ${event.eventType}`);
    }
  }

  /**
   * Validate aggregate invariants
   */
  protected validateInvariants(): void {
    // Ensure session has a valid campaign
    if (!this.sessionState.campaign.id) {
      throw new AggregateValidationError(
        'Session must have a valid campaign',
        'GameSessionAggregate',
        'campaign'
      );
    }
    
    // Ensure GM is set
    if (!this.sessionState.campaign.gmId) {
      throw new AggregateValidationError(
        'Session must have a Game Master',
        'GameSessionAggregate',
        'gmId'
      );
    }
    
    // Ensure player count doesn't exceed maximum
    if (this.connectedPlayers.size > this.config.maxConcurrentPlayers) {
      throw new AggregateValidationError(
        `Session exceeds maximum player count (${this.config.maxConcurrentPlayers})`,
        'GameSessionAggregate',
        'maxConcurrentPlayers'
      );
    }
    
    // Ensure state version is incrementing
    if (this.stateVersion <= 0) {
      throw new AggregateValidationError(
        'State version must be positive',
        'GameSessionAggregate',
        'stateVersion'
      );
    }
  }

  /**
   * Process queued actions after GM reconnection
   */
  private async processQueuedActions(gmId: string): Promise<void> {
    const queuedActions = this.gmDisconnectionHandler.getQueuedActions();
    
    if (queuedActions.length === 0) {
      return;
    }
    
    logger.info(`Processing ${queuedActions.length} queued actions after GM reconnection`, {
      sessionId: this.id,
      gmId
    });
    
    // Create processing context (as GM)
    const context = {
      playerId: gmId,
      sessionId: this.id,
      isPlayerTurn: true, // GM can process any action
      sessionSettings: this.sessionState.sessionSettings,
      playerPermissions: {} // GM has all permissions
    };
    
    // Process all queued actions
    const results = await this.actionProcessor.processQueuedActions(queuedActions, context);
    
    // Clear the queue
    this.gmDisconnectionHandler.clearQueuedActions();
    
    // Create domain event
    const event = this.createEvent('GMReconnected', {
      gmId,
      reconnectedAt: Date.now(),
      processedActionCount: results.length
    }) as GMReconnectedEvent;
    
    this.applyEvent(event);
    
    // Broadcast results
    if (this.config.enableStateBroadcasting) {
      for (const result of results) {
        if (result.result) {
          this.stateBroadcaster.broadcastActionResult(result);
        }
      }
    }
  }

  /**
   * Check if it's the specified player's turn
   */
  private isPlayerTurn(playerId: string): boolean {
    if (!this.sessionState.activeEncounter) {
      return true; // No encounter, any player can act
    }
    
    const currentTurn = this.sessionState.activeEncounter.currentTurn;
    const initiativeOrder = this.sessionState.activeEncounter.initiativeOrder;
    
    if (currentTurn >= 0 && currentTurn < initiativeOrder.length) {
      const currentActor = initiativeOrder[currentTurn];
      // Check if current actor belongs to this player
      const character = this.sessionState.characters.find(c => 
        c.id === currentActor.actorId && c.playerId === playerId
      );
      return !!character;
    }
    
    return false;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Check for missed heartbeats
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeoutThreshold = this.config.heartbeatIntervalMs * 2; // Allow 2 missed heartbeats
    
    for (const [playerId, connection] of this.connectedPlayers) {
      if (connection.role === 'gm' && connection.lastHeartbeat) {
        const timeSinceLastHeartbeat = now - connection.lastHeartbeat;
        
        if (timeSinceLastHeartbeat > timeoutThreshold) {
          this.gmDisconnectionHandler.handleMissedHeartbeat(playerId);
          
          // Create domain event if GM just disconnected
          if (!this.gmDisconnectionHandler.isGMConnected()) {
            const event = this.createEvent('GMDisconnected', {
              gmId: playerId,
              disconnectedAt: now,
              queuedActionCount: this.gmDisconnectionHandler.getQueuedActions().length
            }) as GMDisconnectedEvent;
            
            this.applyEvent(event);
          }
        }
      }
    }
  }

  /**
   * Update state version
   */
  private updateStateVersion(): void {
    this.stateVersion++;
    this.sessionState.stateVersion = this.generateStateVersion();
    this.sessionState.lastUpdated = Date.now();
  }

  /**
   * Generate a state version string
   */
  private generateStateVersion(): string {
    return `${this.id}-${this.stateVersion}-${Date.now()}`;
  }

  /**
   * Clean up aggregate resources
   */
  public dispose(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
    
    this.gmDisconnectionHandler.dispose();
    this.actionProcessor.dispose();
    this.stateBroadcaster.dispose();
    
    logger.info(`GameSession aggregate disposed`, {
      sessionId: this.id
    });
  }
}