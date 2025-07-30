import type { 
  GameActionRequest
} from '@dungeon-lab/shared/schemas/socket/actions.mjs';
import type {
  GMConnectionStatus
} from '@dungeon-lab/shared/schemas/socket/gm-authority.mjs';
import type { IAsset } from '@dungeon-lab/shared/types/index.mjs';

/**
 * Queued action for GM disconnection handling
 * (Different structure from shared QueuedAction to meet aggregate needs)
 */
export interface QueuedAction {
  actionId: string;
  playerId: string;
  sessionId: string;
  timestamp: number;
  pluginId: string;
  actionType: string;
  payload: unknown;
  queuedAt: number;
  expiresAt: number;
}

/**
 * Internal action result for aggregate processing
 * (Different from shared GameActionResult to fit internal workflows)
 */
export interface InternalActionResult {
  actionId: string;
  success: boolean;
  timestamp: number;
  error?: string;
  changes: Array<{
    type: string;
    entity: string;
    entityId: string;
    data: unknown;
  }>;
}

/**
 * Complete session state returned when a player joins
 */
export interface CompleteSessionState {
  // Persistent campaign data
  campaign: CampaignData;
  characters: PlayerCharacterData[];
  
  // Runtime session state
  sessionId: string;
  currentMap: MapState | null;
  activeEncounter: EncounterState | null;
  playerPermissions: SessionPermissions | undefined;
  sessionSettings: SessionSettings;
  
  // GM action queue (filtered for player)
  pendingActions: ActionMessage[];
  
  // Connected players
  connectedPlayers: string[];
  
  // State synchronization info
  stateVersion: string;
  lastUpdated: number;
}

/**
 * Campaign data subset for session state
 */
export interface CampaignData {
  id: string;
  name: string;
  description?: string;
  pluginId: string;
  pluginData: Record<string, unknown>;
  gmId: string;
}

/**
 * Player character data with inventory
 */
export interface PlayerCharacterData {
  id: string;
  name: string;
  playerId: string;
  pluginData: Record<string, unknown>;
  inventory?: Array<{
    itemId: string;
    quantity: number;
    equipped: boolean;
    metadata?: Record<string, unknown>;
  }>;
  avatar?: IAsset;
}

/**
 * Map state information
 */
export interface MapState {
  mapId: string;
  mapData: Record<string, unknown>; // Map document data
  viewState?: MapViewState;
  tokens: TokenData[];
  revealedAreas: Area[];
  fogOfWar: boolean;
  playerPermissions: MapPermissions;
}

/**
 * Map view state (camera position, zoom, etc)
 */
export interface MapViewState {
  centerX: number;
  centerY: number;
  zoom: number;
  rotation: number;
}

/**
 * Token data on a map
 */
export interface TokenData {
  id: string;
  actorId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  isVisible: boolean;
  conditions?: string[];
}

/**
 * Area definition for fog of war
 */
export interface Area {
  id: string;
  points: Array<{ x: number; y: number }>;
  type: 'revealed' | 'hidden';
}

/**
 * Map-specific permissions
 */
export interface MapPermissions {
  canMoveTokens: boolean;
  canRevealAreas: boolean;
  viewRestrictedAreas: boolean;
}

/**
 * Active encounter state
 */
export interface EncounterState {
  encounterId: string;
  initiativeOrder: InitiativeEntry[];
  currentTurn: number;
  round: number;
  phase: 'setup' | 'combat' | 'resolution';
  
  // Player-specific encounter data
  playerCharacters: EncounterParticipant[];
  
  // Visible effects (based on player permissions)
  activeEffects: Effect[];
  
  // Combat state
  combatState: CombatState;
  
  // Turn management
  turnState: TurnState;
}

/**
 * Initiative order entry
 */
export interface InitiativeEntry {
  actorId: string;
  initiative: number;
  isActive: boolean;
  hasActed: boolean;
}

/**
 * Encounter participant
 */
export interface EncounterParticipant {
  characterId: string;
  playerId: string;
  isActive: boolean;
  conditions: string[];
}

/**
 * Active effect in encounter
 */
export interface Effect {
  id: string;
  name: string;
  targetId: string;
  sourceId?: string;
  duration: number;
  remainingRounds: number;
}

/**
 * Combat state tracking
 */
export interface CombatState {
  isActive: boolean;
  startedAt?: number;
  pausedAt?: number;
}

/**
 * Turn state for a player
 */
export interface TurnState {
  isPlayerTurn: boolean;
  canAct: boolean;
  actionsRemaining: number;
  timeRemaining?: number;
}

/**
 * Session-wide permissions for a player
 */
export interface SessionPermissions {
  canMoveTokens: boolean;
  canRevealAreas: boolean;
  viewRestrictedAreas: boolean;
  revealedAreas: Area[];
  fogOfWarEnabled: boolean;
  canManageEncounter: boolean;
  canEditCharacters: boolean;
}

/**
 * Session settings (GM configurable)
 */
export interface SessionSettings {
  isPaused?: boolean;
  allowPlayerActions?: boolean;
  voiceChatEnabled?: boolean;
  textChatEnabled?: boolean;
  turnTimeLimit?: number;
  autoAdvanceTurns?: boolean;
  requireGMApproval?: boolean;
}

/**
 * Runtime session state (not persisted)
 */
export interface RuntimeSessionState {
  playerRole: 'gm' | 'player';
  sessionPhase: 'lobby' | 'active' | 'paused' | 'ended';
  isPaused: boolean;
  allowPlayerActions: boolean;
  
  // Communication state
  voiceChatEnabled: boolean;
  textChatEnabled: boolean;
  
  // Game-specific runtime state
  pluginRuntimeData: Record<string, unknown>;
}

/**
 * Action message for GM processing
 */
export interface ActionMessage {
  id: string;
  playerId: string;
  sessionId: string;
  action: GameActionRequest;
  timestamp: number;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'rejected';
  result?: InternalActionResult;
}

/**
 * Player connection info
 */
export interface PlayerConnection {
  userId: string;
  socketId: string;
  role: 'gm' | 'player';
  characterIds: string[];
  connectedAt: number;
  lastHeartbeat?: number;
}

/**
 * GM disconnection state
 */
export interface GMDisconnectionState {
  isConnected: boolean;
  disconnectedAt?: number;
  reconnectedAt?: number;
  queuedActions: QueuedAction[];
  missedHeartbeats: number;
  connectionStatus: GMConnectionStatus;
}

/**
 * Map update for broadcasting
 */
export interface MapUpdate {
  mapId: string;
  changes: Partial<MapState>;
  revealedAreas?: Area[];
  tokens?: TokenData[];
}

/**
 * Encounter update for broadcasting
 */
export interface EncounterUpdate {
  encounterId: string;
  changes: Partial<EncounterState>;
  participants?: EncounterParticipant[];
  activeEffects?: Effect[];
}

/**
 * Inventory change notification
 */
export interface InventoryChange {
  type: 'add' | 'remove' | 'update' | 'equip' | 'unequip';
  itemId: string;
  quantity?: number;
  metadata?: Record<string, unknown>;
}