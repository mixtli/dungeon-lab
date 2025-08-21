/**
 * Minimal Plugin Context Implementation
 * 
 * Provides read-only data access and plugin-specific UI state management.
 */

import type { 
  PluginContext, 
  PluginStore,
  DocumentSearchQuery,
  CompendiumSearchQuery,
  GameStateContext,
  ActionHandler
} from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { RollTypeHandler } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { BaseDocument, ICompendiumEntry, ActionRequestResult, GameActionType } from '@dungeon-lab/shared/types/index.mjs';
import type { Roll, RollCallback, RollRequest } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { ReactivePluginStore } from '../plugin-store.mjs';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';
import { createPluginGameStateService } from '../plugin-game-state.service.mjs';
import { useGameStateStore } from '../../stores/game-state.store.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { rollHandlerService } from '../roll-handler.service.mjs';
import { PlayerActionService } from '../player-action.service.mjs';
import { 
  registerPluginActionHandler,
  unregisterPluginActionHandler,
  unregisterAllPluginActionHandlers
} from '../multi-handler-registry.mjs';

export interface PluginContextOptions {
  includeGameState?: boolean;
}

/**
 * Minimal PluginContext implementation focused on read-only data access
 * and plugin-specific UI state management
 */
export class PluginContextImpl implements PluginContext {
  public readonly store: PluginStore;
  public readonly gameState?: GameStateContext;
  private compendiumsClient: CompendiumsClient;
  private documentsClient: DocumentsClient;
  private _playerActionService?: PlayerActionService;
  
  constructor(private pluginId: string, options: PluginContextOptions = {}) {
    // Initialize plugin-scoped store
    this.store = new ReactivePluginStore();
    
    // Initialize API clients for read-only operations
    this.compendiumsClient = new CompendiumsClient();
    this.documentsClient = new DocumentsClient();
    
    // PlayerActionService will be lazy-initialized when needed
    // to avoid Pinia store issues during plugin loading
    
    // Optionally initialize game state context
    if (options.includeGameState) {
      const gameStateStore = useGameStateStore();
      
      // Only provide game state context if there's an active session
      if (gameStateStore.isInSession) {
        this.gameState = createPluginGameStateService();
        console.log(`[PluginContext] Created context with game state for plugin '${pluginId}'`);
      } else {
        console.log(`[PluginContext] Created context without game state (no active session) for plugin '${pluginId}'`);
      }
    } else {
      console.log(`[PluginContext] Created minimal context for plugin '${pluginId}'`);
    }
  }
  
  /**
   * Lazy getter for PlayerActionService to avoid Pinia issues during initialization
   */
  private get playerActionService(): PlayerActionService {
    if (!this._playerActionService) {
      this._playerActionService = new PlayerActionService();
    }
    return this._playerActionService;
  }
  
  /**
   * Get a document by ID for display purposes
   */
  async getDocument(id: string): Promise<BaseDocument> {
    try {
      const document = await this.documentsClient.getDocument(id);
      if (!document) {
        throw new Error(`Document ${id} not found`);
      }
      // Ensure itemState is always defined
      if (!document.itemState) {
        document.itemState = {};
      }
      return document;
    } catch (error) {
      console.error(`[PluginContext] Failed to get document ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search documents for display purposes
   */
  async searchDocuments(query: DocumentSearchQuery): Promise<BaseDocument[]> {
    try {
      return await this.documentsClient.searchDocuments(query);
    } catch (error) {
      console.error('[PluginContext] Failed to search documents:', error);
      throw error;
    }
  }
  
  /**
   * Get a compendium entry by ID for display purposes
   */
  async getCompendiumEntry(id: string): Promise<ICompendiumEntry> {
    try {
      return await this.compendiumsClient.getCompendiumEntry(id);
    } catch (error) {
      console.error(`[PluginContext] Failed to get compendium entry ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Search compendium entries for display purposes
   */
  async searchCompendiumEntries(query: CompendiumSearchQuery): Promise<ICompendiumEntry[]> {
    try {
      const result = await this.compendiumsClient.getAllCompendiumEntries(query as Record<string, string | number | boolean>);
      return result.entries;
    } catch (error) {
      console.error('[PluginContext] Failed to search compendium entries:', error);
      throw error;
    }
  }
  
  /**
   * Submit a roll to the server
   * Plugins use this instead of direct socket access
   */
  submitRoll(roll: Roll): void {
    const socketStore = useSocketStore();
    const socket = socketStore.socket;
    
    if (!socket) {
      console.error('No socket connection available for roll submission');
      return;
    }
    
    socket.emit('roll', roll, (response: RollCallback) => {
      if (!response.success) {
        console.error(`[PluginContext] Roll submission failed:`, response.error);
      } else {
        console.log(`[PluginContext] Roll submitted successfully for plugin '${this.pluginId}'`);
      }
    });
    console.log(`[PluginContext] Submitted roll for plugin '${this.pluginId}':`, roll);
  }
  
  /**
   * Send a chat message with optional metadata
   */
  sendChatMessage(message: string, metadata?: {
    type?: 'text' | 'roll';
    rollData?: unknown;
    recipient?: 'public' | 'gm' | 'private';
  }): void {
    const socketStore = useSocketStore();
    const socket = socketStore.socket;
    
    if (!socket) {
      console.error('No socket connection available for chat message');
      return;
    }

    // Get current session ID from game session store
    const gameSessionStore = useGameSessionStore();
    const sessionId = gameSessionStore.currentSession?.id;
    if (!sessionId) {
      console.error('No active session for chat message');
      return;
    }

    // Create chat metadata
    const chatMetadata = {
      sender: {
        type: 'user' as const,
        id: socketStore.userId || ''
      },
      recipient: metadata?.recipient === 'gm' 
        ? { type: 'session' as const, id: sessionId }
        : metadata?.recipient === 'private'
        ? { type: 'user' as const, id: socketStore.userId || '' }
        : { type: 'session' as const, id: sessionId }, // default to public
      timestamp: new Date().toISOString(),
      type: metadata?.type || 'text',
      rollData: metadata?.rollData
    };

    // Send chat message
    socket.emit('chat', chatMetadata, message);
    console.log(`[PluginContext] Sent chat message from plugin '${this.pluginId}':`, { 
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      type: metadata?.type,
      recipient: metadata?.recipient 
    });
  }

  /**
   * Register a handler for a specific roll type
   */
  registerRollHandler(rollType: string, handler: RollTypeHandler): void {
    rollHandlerService.registerHandler(rollType, handler, this);
    console.log(`[PluginContext] Registered roll handler for plugin '${this.pluginId}', roll type: ${rollType}`);
  }

  /**
   * Register an action handler for this plugin
   */
  registerActionHandler(actionType: string, handler: Omit<ActionHandler, 'pluginId'>): void {
    registerPluginActionHandler(this.pluginId, actionType, handler);
    console.log(`[PluginContext] Registered action handler for plugin '${this.pluginId}', action type: ${actionType}`);
  }

  /**
   * Unregister an action handler for this plugin
   */
  unregisterActionHandler(actionType: string): void {
    unregisterPluginActionHandler(this.pluginId, actionType);
    console.log(`[PluginContext] Unregistered action handler for plugin '${this.pluginId}', action type: ${actionType}`);
  }

  /**
   * Unregister all action handlers for this plugin
   */
  unregisterAllActionHandlers(): void {
    unregisterAllPluginActionHandlers(this.pluginId);
    console.log(`[PluginContext] Unregistered all action handlers for plugin '${this.pluginId}'`);
  }

  /**
   * Request a game action to be performed
   * This goes through the standard GM approval workflow
   */
  async requestAction(
    actionType: string,
    parameters: Record<string, unknown>,
    options: { description?: string } = {}
  ): Promise<ActionRequestResult> {
    try {
      console.log(`[PluginContext] Requesting action '${actionType}' from plugin '${this.pluginId}':`, {
        actionType,
        parameters,
        description: options.description
      });

      const result = await this.playerActionService.requestAction(
        actionType as GameActionType, // Cast to GameActionType - the service will validate
        parameters,
        options
      );

      console.log(`[PluginContext] Action request '${actionType}' result for plugin '${this.pluginId}':`, {
        success: result.success,
        approved: result.approved,
        error: result.error
      });

      return result;
    } catch (error) {
      console.error(`[PluginContext] Failed to request action '${actionType}' from plugin '${this.pluginId}':`, error);
      
      // Return a failed result instead of throwing
      return {
        success: false,
        approved: false,
        requestId: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send roll requests to specific players (GM only)
   */
  sendRollRequest(playerId: string, rollRequest: RollRequest): void {
    const socketStore = useSocketStore();
    const socket = socketStore.socket;
    
    if (!socket) {
      console.error('[PluginContext] No socket connection available for roll request');
      return;
    }

    // Validate user is GM
    const gameSessionStore = useGameSessionStore();
    if (!gameSessionStore.isGameMaster) {
      console.error('[PluginContext] Only GMs can send roll requests');
      return;
    }

    try {
      // Emit the roll request event with player ID
      socket.emit('roll:request', {
        ...rollRequest,
        playerId
      });
      console.log(`[PluginContext] Sent roll request to player '${playerId}' from plugin '${this.pluginId}':`, rollRequest.requestId);
    } catch (error) {
      console.error(`[PluginContext] Failed to send roll request from plugin '${this.pluginId}':`, error);
    }
  }
  
  /**
   * Get the plugin ID this context belongs to
   */
  getPluginId(): string {
    return this.pluginId;
  }
  
  /**
   * Cleanup resources when plugin is unloaded
   */
  destroy(): void {
    // Unregister all action handlers
    this.unregisterAllActionHandlers();
    
    // Clear store
    (this.store as ReactivePluginStore).clear();
    
    console.log(`[PluginContext] Destroyed context for plugin '${this.pluginId}'`);
  }
}

/**
 * Factory function to create PluginContext instances
 */
export function createPluginContext(pluginId: string, options?: PluginContextOptions): PluginContext {
  return new PluginContextImpl(pluginId, options);
}