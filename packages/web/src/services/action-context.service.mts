import type { 
  AsyncActionContext, 
  RollData, 
  RollRequestSpec, 
  ChatOptions,
  RollResultData
} from '@dungeon-lab/shared-ui/types/action-context.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/types/socket/index.mjs';
import type { PluginContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import { rollRequestService, RollRequestService } from './roll-request.service.mts';
import { useChatStore } from '../stores/chat.store.mts';

/**
 * Implementation of AsyncActionContext with roll request capabilities
 * Provides unified utilities for complex action handlers like spell casting
 */
export class ActionContextImpl implements AsyncActionContext {
  private activeRequests = new Set<string>();

  constructor(
    public readonly pluginContext: PluginContext,
    private rollRequestService: RollRequestService
  ) {}

  /**
   * Send a roll request to a specific player and await the result
   */
  async sendRollRequest(
    playerId: string,
    rollType: string,
    rollData: RollData
  ): Promise<RollServerResult> {
    console.log('[ActionContext] Sending roll request:', {
      playerId,
      rollType,
      message: rollData.message
    });

    try {
      const result = await this.rollRequestService.sendRollRequest(
        playerId,
        rollType,
        rollData
      );

      console.log('[ActionContext] Roll request completed:', {
        playerId,
        rollType,
        total: result.results.reduce((sum, diceGroup) => 
          sum + diceGroup.results.reduce((groupSum, roll) => groupSum + roll, 0), 0)
      });

      return result;
    } catch (error) {
      console.error('[ActionContext] Roll request failed:', error);
      throw error;
    }
  }

  /**
   * Send multiple roll requests in parallel and await all results
   */
  async sendMultipleRollRequests(requests: RollRequestSpec[]): Promise<RollServerResult[]> {
    console.log('[ActionContext] Sending multiple roll requests:', {
      count: requests.length,
      requests: requests.map(r => ({ playerId: r.playerId, rollType: r.rollType }))
    });

    try {
      const results = await this.rollRequestService.sendMultipleRollRequests(requests);

      console.log('[ActionContext] Multiple roll requests completed:', {
        count: results.length,
        totals: results.map(result => 
          result.results.reduce((sum, diceGroup) => 
            sum + diceGroup.results.reduce((groupSum, roll) => groupSum + roll, 0), 0)
        )
      });

      return results;
    } catch (error) {
      console.error('[ActionContext] Multiple roll requests failed:', error);
      throw error;
    }
  }

  /**
   * Send a chat message to the game session
   */
  sendChatMessage(message: string, options?: ChatOptions): void {
    console.log('[ActionContext] Sending chat message:', {
      message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      options
    });

    try {
      const chatStore = useChatStore();
      
      // Construct recipient ID if specified
      let recipientId: string | undefined;
      if (options?.recipientId && options?.recipientType) {
        recipientId = `${options.recipientType}:${options.recipientId}`;
      } else if (options?.recipientId) {
        recipientId = options.recipientId;
      }

      chatStore.sendMessage(message, recipientId);

      console.log('[ActionContext] Chat message sent successfully');
    } catch (error) {
      console.error('[ActionContext] Failed to send chat message:', error);
      // Don't throw - chat message failures shouldn't break action execution
    }
  }

  /**
   * Send a structured roll result to the chat
   */
  sendRollResult(rollResultData: RollResultData): void {
    console.log('[ActionContext] Sending roll result:', {
      message: rollResultData.message,
      result: rollResultData.result,
      success: rollResultData.success,
      rollType: rollResultData.rollType
    });

    try {
      const chatStore = useChatStore();
      chatStore.addRollResult(rollResultData);
      console.log('[ActionContext] Roll result sent successfully');
    } catch (error) {
      console.error('[ActionContext] Failed to send roll result:', error);
      // Don't throw - chat failures shouldn't break action execution
    }
  }

  /**
   * Request confirmation from the GM for an action
   * TODO: Implement actual GM confirmation dialog
   */
  async requestGMConfirmation(message: string): Promise<boolean> {
    console.log('[ActionContext] GM confirmation requested:', message);
    
    // TODO: Implement actual GM confirmation dialog
    // For now, auto-approve all requests
    console.log('[ActionContext] Auto-approving GM confirmation (placeholder implementation)');
    
    return Promise.resolve(true);
  }

  /**
   * Clean up any pending requests and resources
   */
  cleanup(): void {
    console.log('[ActionContext] Cleaning up action context:', {
      activeRequestCount: this.activeRequests.size
    });

    // Cancel any tracked requests (if we implement request tracking)
    for (const requestId of this.activeRequests) {
      this.rollRequestService.cancelRequest(requestId);
    }
    
    this.activeRequests.clear();
  }
}

/**
 * Factory function to create ActionContextImpl instances
 * Provides a clean API for creating contexts with proper dependencies
 */
export function createActionContext(
  rollRequestServiceParam: RollRequestService = rollRequestService,
  pluginContext?: PluginContext
): AsyncActionContext {
  // If no pluginContext provided, create a minimal mock for backward compatibility
  const context = pluginContext || ({
    getDocument: async (id: string) => { throw new Error(`getDocument not available: ${id}`); },
    searchDocuments: async () => { throw new Error('searchDocuments not available'); },
    getCompendiumEntry: async (id: string) => { throw new Error(`getCompendiumEntry not available: ${id}`); },
    searchCompendiumEntries: async () => { throw new Error('searchCompendiumEntries not available'); },
    store: {} as Record<string, unknown>,
    gameState: undefined
  } as unknown as PluginContext);
  
  return new ActionContextImpl(context, rollRequestServiceParam);
}