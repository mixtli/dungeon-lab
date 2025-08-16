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
  GameStateContext
} from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { RollTypeHandler } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { BaseDocument, ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import type { Roll, RollCallback } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import { ReactivePluginStore } from '../plugin-store.mjs';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import { DocumentsClient } from '@dungeon-lab/client/index.mjs';
import { createPluginGameStateService } from '../plugin-game-state.service.mjs';
import { useGameStateStore } from '../../stores/game-state.store.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { useSocketStore } from '../../stores/socket.store.mjs';
import { rollHandlerService } from '../roll-handler.service.mjs';

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
  
  constructor(private pluginId: string, options: PluginContextOptions = {}) {
    // Initialize plugin-scoped store
    this.store = new ReactivePluginStore();
    
    // Initialize API clients for read-only operations
    this.compendiumsClient = new CompendiumsClient();
    this.documentsClient = new DocumentsClient();
    
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
   * Get the plugin ID this context belongs to
   */
  getPluginId(): string {
    return this.pluginId;
  }
  
  /**
   * Cleanup resources when plugin is unloaded
   */
  destroy(): void {
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