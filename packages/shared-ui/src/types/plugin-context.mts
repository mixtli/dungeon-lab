/**
 * Plugin Context Types
 * 
 * This file contains interfaces for the minimal plugin context that provides
 * read-only data access and plugin-specific UI state management.
 */

import type { ComputedRef, Ref } from 'vue';
import type { BaseDocument, ICompendiumEntry, ICharacter, IActor, IItem, IEncounter, IToken, ServerGameStateWithVirtuals, StateUpdateBroadcast } from '@dungeon-lab/shared/types/index.mjs';
import type { Roll } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { RollTypeHandler } from './plugin.mjs';

// Forward declaration for ActionHandler - defined in web package
export interface ActionHandler {
  pluginId?: string;
  priority?: number;
  requiresManualApproval?: boolean;
  gmOnly?: boolean;
  validate?: (request: any, gameState: ServerGameStateWithVirtuals) => Promise<{ valid: boolean; error?: { code: string; message: string; }; }>;
  execute?: (request: any, draft: ServerGameStateWithVirtuals) => Promise<void>;
  approvalMessage?: (request: any) => string;
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
   */
  submitRoll(roll: Roll): void;
  
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
}