/**
 * GameSession Aggregate Public API
 * 
 * This file provides the public interface for the GameSession aggregate,
 * following Domain-Driven Design (DDD) principles with folder-per-aggregate organization.
 */

// Main aggregate class
import { GameSessionAggregate } from './game-session.aggregate.mjs';
export { GameSessionAggregate };

// Import types for internal use
import type {
  CompleteSessionState,
  CampaignData,
  PlayerCharacterData,
  ActionMessage,
  MapUpdate,
  EncounterUpdate
} from './types.mjs';

// Domain events
export type {
  GameSessionCreatedEvent,
  PlayerJoinedSessionEvent,
  PlayerLeftSessionEvent,
  GMDisconnectedEvent,
  GMReconnectedEvent,
  ActionProcessedEvent,
  SessionStateUpdatedEvent
} from './game-session.aggregate.mjs';

// Type definitions for external use  
export type {
  CompleteSessionState,
  CampaignData,
  PlayerCharacterData,
  MapState,
  MapViewState,
  TokenData,
  Area,
  MapPermissions,
  EncounterState,
  InitiativeEntry,
  EncounterParticipant,
  Effect,
  CombatState,
  TurnState,
  SessionPermissions,
  SessionSettings,
  RuntimeSessionState,
  ActionMessage,
  PlayerConnection,
  GMDisconnectionState,
  MapUpdate,
  EncounterUpdate,
  InventoryChange
} from './types.mjs';

// Component classes (for advanced usage or testing)
export { GMDisconnectionHandler } from './gm-disconnection-handler.mjs';
export { ActionProcessor } from './action-processor.mjs';
export { StateBroadcaster } from './state-broadcaster.mjs';

/**
 * Factory function to create a GameSession aggregate
 * 
 * @param sessionId - Unique identifier for the session
 * @param initialState - Initial session state
 * @param socketServer - Socket.IO server instance for broadcasting
 * @param config - Optional configuration overrides
 * @returns Configured GameSession aggregate instance
 */
export function createGameSessionAggregate(
  sessionId: string,
  initialState: CompleteSessionState,
  socketServer: unknown, // Using unknown to avoid circular dependency with Socket.IO types
  config?: {
    enableHeartbeatMonitoring?: boolean;
    heartbeatIntervalMs?: number;
    enableActionQueuing?: boolean;
    enableStateBroadcasting?: boolean;
    maxConcurrentPlayers?: number;
  }
): GameSessionAggregate {
  return new GameSessionAggregate(sessionId, initialState, socketServer as never, config);
}

/**
 * Helper function to create initial session state from database model
 * 
 * This function converts a GameSession database model to the CompleteSessionState
 * format expected by the aggregate.
 */
export function createInitialSessionState(
  gameSessionModel: unknown, // Database model
  campaignData: CampaignData,
  characters: PlayerCharacterData[]
): CompleteSessionState {
  const model = gameSessionModel as { 
    id?: string; 
    _id?: { toString(): string }; 
    settings?: Record<string, unknown> 
  };
  
  return {
    campaign: campaignData,
    characters,
    sessionId: model.id || model._id?.toString() || 'unknown',
    currentMap: null, // Will be set when a map is loaded
    activeEncounter: null, // Will be set when an encounter starts
    playerPermissions: undefined, // Will be set per player
    sessionSettings: {
      isPaused: false,
      allowPlayerActions: true,
      voiceChatEnabled: false,
      textChatEnabled: true,
      turnTimeLimit: undefined,
      autoAdvanceTurns: false,
      requireGMApproval: false,
      ...(model.settings || {})
    },
    pendingActions: [],
    connectedPlayers: [],
    stateVersion: `${model.id || model._id?.toString() || 'unknown'}-0-${Date.now()}`,
    lastUpdated: Date.now()
  };
}

/**
 * Helper function to validate session state structure
 */
export function validateSessionState(state: CompleteSessionState): boolean {
  try {
    // Basic validation checks
    if (!state.sessionId || !state.campaign?.id || !state.campaign?.gmId) {
      return false;
    }
    
    if (!Array.isArray(state.characters) || !Array.isArray(state.connectedPlayers)) {
      return false;
    }
    
    if (!state.stateVersion || !state.lastUpdated) {
      return false;
    }
    
    // Validate session settings
    if (!state.sessionSettings || typeof state.sessionSettings !== 'object') {
      return false;
    }
    
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Utility type guards for runtime type checking
 */
export const TypeGuards = {
  isCompleteSessionState(obj: unknown): obj is CompleteSessionState {
    return typeof obj === 'object' && obj !== null && validateSessionState(obj as CompleteSessionState);
  },
  
  isActionMessage(obj: unknown): obj is ActionMessage {
    return typeof obj === 'object' && 
           obj !== null && 
           'id' in obj && 
           'playerId' in obj && 
           'sessionId' in obj && 
           'action' in obj && 
           'timestamp' in obj && 
           'status' in obj;
  },
  
  isMapUpdate(obj: unknown): obj is MapUpdate {
    return typeof obj === 'object' && 
           obj !== null && 
           'mapId' in obj && 
           'changes' in obj;
  },
  
  isEncounterUpdate(obj: unknown): obj is EncounterUpdate {
    return typeof obj === 'object' && 
           obj !== null && 
           'encounterId' in obj && 
           'changes' in obj;
  }
};