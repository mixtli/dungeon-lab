/**
 * Plugin Context Types
 * 
 * This file contains interfaces for the minimal plugin context that provides
 * read-only data access and plugin-specific UI state management.
 */

import type { ComputedRef, Ref, Component } from 'vue';
import type { BaseDocument, ICompendiumEntry, ICharacter, IActor, IItem, IEncounter, IToken, ServerGameStateWithVirtuals, StateUpdateBroadcast, GameActionRequest, ActionRequestResult } from '@dungeon-lab/shared/types/index.mjs';
import type { Roll, RollRequest } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { RollTypeHandler } from './plugin.mjs';
import type { AsyncActionContext } from './action-context.mjs';

/**
 * Validation result returned by action handlers
 */
export interface ActionValidationResult {
  valid: boolean;
  error?: { 
    code: string; 
    message: string; 
  };
  resourceCosts?: ResourceCost[];
}

/**
 * Resource cost information for validation display
 */
export interface ResourceCost {
  resourcePath: string;    // Path within document (e.g., 'spellSlotsUsed.level1')
  amount: number;          // Amount to consume
  storageType: 'data' | 'state';  // 'data' = pluginData, 'state' = document state
}

/**
 * Standard validation function signature for action handlers
 * Uses readonly gameState since validation should never mutate state
 * This matches Vue's readonly proxy types from Pinia stores
 */
export type ActionValidationHandler = (
  request: GameActionRequest,
  gameState: Readonly<ServerGameStateWithVirtuals>
) => Promise<ActionValidationResult>;

/**
 * Standard execution function signature for action handlers
 */
export type ActionExecutionHandler = (
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  context: AsyncActionContext
) => Promise<void>;

/**
 * Action Handler Interface - unified system
 */
export interface ActionHandler {
  pluginId?: string;           // undefined = core handler
  priority?: number;           // Lower = runs first (core = 0, plugins = 100+)
  requiresManualApproval?: boolean;  // Default: false = auto-execute
  gmOnly?: boolean;                  // Default: false = players can use
  validate?: ActionValidationHandler;
  execute?: ActionExecutionHandler;
  approvalMessage?: (request: GameActionRequest) => Promise<string>;
}

/**
 * Context provided to token context action handlers when they are executed
 * (This is the execution context passed TO plugin handlers when an action runs)
 */
export interface TokenActionContext {
  selectedToken: IToken;                    // The token that was right-clicked
  selectedTokens?: IToken[];               // Multiple tokens if multi-select is supported
  pluginContext: PluginContext;           // Plugin context for making action requests
  showDialog?: (component: Component, props?: Record<string, unknown>) => Promise<unknown>; // For showing custom dialogs
  gameState: ServerGameStateWithVirtuals; // Current game state
}

/**
 * Token context menu action definition (registered BY plugins to appear in context menus)
 * (This is the action definition/configuration that plugins register)
 */
export interface TokenContextAction {
  id: string;                             // Unique identifier (e.g., 'dnd5e:dodge')
  label: string;                          // Button text displayed to user
  icon?: string;                          // Icon class/name (optional)
  groupLabel?: string;                    // Group header (e.g., "Combat Actions")
  priority?: number;                      // Display order (lower = higher up)
  condition?: (token: IToken, gameState: Readonly<ServerGameStateWithVirtuals>) => boolean; // Show/hide condition
  handler: (context: TokenActionContext) => void | Promise<void>; // Action handler function
}

/**
 * Plugin store interface for reactive state management of plugin-specific UI state
 * (e.g., active tabs, expanded sections, UI preferences)
 */
export interface PluginStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe<T>(key: string, callback: (value: T) => void): () => void;
}

/**
 * Search query interface for documents
 */
export interface DocumentSearchQuery {
  query?: string;
  documentType?: string;
  pluginId?: string;
  limit?: number;
  [key: string]: unknown; // Allow additional query parameters
}

/**
 * Search query interface for compendium entries
 */
export interface CompendiumSearchQuery {
  search?: string;
  pluginId?: string;
  documentType?: string;
  pluginDocumentType?: string;
  category?: string;
  isActive?: boolean;
  limit?: number;
  [key: string]: unknown; // Allow additional query parameters
}

/**
 * Game state context provides reactive read-only access to unified game state
 * for plugin components during active game sessions
 */
export interface GameStateContext {
  // Direct reactive access to game state arrays (maintains Vue reactivity)
  readonly characters: ComputedRef<ICharacter[]>;
  readonly actors: ComputedRef<IActor[]>;
  readonly items: ComputedRef<IItem[]>;
  readonly currentEncounter: ComputedRef<IEncounter | null>;
  
  // State metadata
  readonly gameStateVersion: Ref<string | null>;
  
  // Synchronous helper methods for convenience (work with reactive data)
  getActorById(id: string): IActor | null;
  getCharacterById(id: string): ICharacter | null;
  getItemById(id: string): IItem | null;
  getItemsByCarrier(carrierId: string): IItem[];
  getTokensByDocument(documentId: string, documentType?: string): IToken[];
  
  // Subscribe to state changes for side effects
  subscribeToState(callback: (state: Readonly<ServerGameStateWithVirtuals>) => void): () => void;
  subscribeToStateUpdates(callback: (broadcast: StateUpdateBroadcast) => void): () => void;
}

/**
 * Plugin context provides minimal read-only access to application data
 * and plugin-specific UI state management
 */
export interface PluginContext {
  /** Read-only data access for ancillary display information */
  getDocument(id: string): Promise<BaseDocument>;
  searchDocuments(query: DocumentSearchQuery): Promise<BaseDocument[]>;
  getCompendiumEntry(id: string): Promise<ICompendiumEntry>;
  searchCompendiumEntries(query: CompendiumSearchQuery): Promise<ICompendiumEntry[]>;
  
  /** Reactive store for plugin UI state */
  store: PluginStore;
  
  /** Game state context (available only during active game sessions) */
  gameState?: GameStateContext;
  
  /**
   * Submit a roll to the server
   * Plugins use this instead of direct socket access
   * User dice preferences are automatically applied by the RollService
   */
  submitRoll(roll: Roll): Promise<void>;
  
  /**
   * Send a chat message with optional metadata
   * Plugins use this to send messages like roll results to chat
   */
  sendChatMessage(message: string, metadata?: {
    type?: 'text' | 'roll';
    rollData?: unknown;
    recipient?: 'public' | 'gm' | 'private';
  }): void;
  
  /**
   * Register a handler for a specific roll type
   * Plugins use this to handle their own roll types
   */
  registerRollHandler(rollType: string, handler: RollTypeHandler): void;
  
  /**
   * Register an action handler for this plugin
   * Action handlers process game actions like token movement, document updates, etc.
   */
  registerActionHandler(actionType: string, handler: Omit<ActionHandler, 'pluginId'>): void;
  
  /**
   * Unregister an action handler for this plugin
   */
  unregisterActionHandler(actionType: string): void;
  
  /**
   * Unregister all action handlers for this plugin
   * Called during plugin cleanup/unload
   */
  unregisterAllActionHandlers(): void;
  
  /**
   * Request a game action to be performed
   * This goes through the standard GM approval workflow
   */
  requestAction(
    actionType: string,
    actorId: string | undefined,
    parameters: Record<string, unknown>,
    actorTokenId?: string,
    targetTokenIds?: string[],
    options?: { description?: string }
  ): Promise<ActionRequestResult>;

  /**
   * Send roll requests to specific players
   * Used by GM clients to request damage rolls from players
   */
  sendRollRequest(playerId: string, rollRequest: RollRequest): void;

  /**
   * Register a token context menu action
   * Allows plugins to add custom actions to the token right-click menu
   */
  registerTokenAction(action: TokenContextAction): void;

  /**
   * Unregister a token context menu action
   */
  unregisterTokenAction(actionId: string): void;

  /**
   * Get all registered token actions for display in context menus
   */
  getTokenActions(): TokenContextAction[];

  /**
   * Show notification toast to user
   * Plugins use this instead of directly accessing notification stores
   */
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number): void;
  
  /**
   * Open a document sheet by ID and type
   * Plugins use this to open spell sheets, item sheets, etc.
   */
  openDocumentSheet(documentId: string, documentType: string): void;
  
  /**
   * Get asset URL for images/files
   * Plugins use this to load images from the asset system
   */
  getAssetUrl(assetId: string): Promise<string>;
}