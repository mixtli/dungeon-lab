import { Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';
import type { RollServerResult } from '@dungeon-lab/shared/types/socket/index.mjs';
import type { RollRequest } from '@dungeon-lab/shared/schemas/roll.schema.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { RollTypeHandler, RollHandlerContext } from '@dungeon-lab/shared-ui/types/plugin.mjs';
import type { PluginContext } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';
import type { FollowUpChatMessage, FollowUpRollRequest, FollowUpActionRequest } from '@dungeon-lab/shared/interfaces/processed-roll-result.interface.mjs';
import { useAuthStore } from '../stores/auth.store.mjs';
import { useGameSessionStore } from '../stores/game-session.store.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import { useChatStore } from '../stores/chat.store.mjs';
import type { RollRequestService } from './roll-request.service.mts';
// Using console.log for client-side logging

/**
 * Handler registration info
 */
interface HandlerRegistration {
  handler: RollTypeHandler;
  pluginContext: PluginContext;
}

/**
 * Roll Handler Service
 * Listens for roll:result events and dispatches to registered handlers
 * Does not store roll history - just processes events
 */
export class RollHandlerService {
  private handlers = new Map<string, HandlerRegistration>();
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private rollRequestService: RollRequestService | null = null;

  /**
   * Register RollRequestService to receive roll result notifications
   */
  setRollRequestService(rollRequestService: RollRequestService): void {
    this.rollRequestService = rollRequestService;
    console.log('[RollHandlerService] RollRequestService registered for promise resolution');
  }

  /**
   * Setup socket listener for roll:result events
   */
  setupListener(socket: Socket<ServerToClientEvents, ClientToServerEvents>): void {
    // Clean up existing listeners
    if (this.socket) {
      this.socket.off('roll:result');
    }

    this.socket = socket;

    // Listen for roll results from server
    socket.on('roll:result', (serverResult: RollServerResult) => {
      this.handleRollResult(serverResult);
    });

    console.log('[RollHandlerService] Roll result listener setup complete');
  }

  /**
   * Register a handler for a specific roll type with its plugin context
   */
  registerHandler(rollType: string, handler: RollTypeHandler, pluginContext: PluginContext): void {
    this.handlers.set(rollType, { handler, pluginContext });
    console.log(`[RollHandlerService] Registered handler for roll type: ${rollType}`);
  }

  /**
   * Unregister a handler for a roll type
   */
  unregisterHandler(rollType: string): void {
    this.handlers.delete(rollType);
    console.log(`[RollHandlerService] Unregistered handler for roll type: ${rollType}`);
  }

  /**
   * Handle incoming roll result by dispatching to appropriate handler
   */
  private async handleRollResult(result: RollServerResult): Promise<void> {
    try {
      console.log('[RollHandlerService] Processing roll result:', {
        title: result.metadata.title,
        rollType: result.rollType,
        pluginId: result.pluginId,
        userId: result.userId
      });

      // Get handler registration for this roll type first
      const handlerRegistration = this.handlers.get(result.rollType);
      let processedResult = result;
      
      // Create handler context with GM detection
      const authStore = useAuthStore();
      const gameSessionStore = useGameSessionStore();
      const gameStateStore = useGameStateStore();
      const isGM = gameSessionStore.isGameMaster;
      const context: RollHandlerContext = {
        isGM,
        userId: authStore.user?.id || '',
        // Provide game state access for GM clients (cast to mutable type for weapon handlers)
        gameState: isGM ? gameStateStore.gameState as ServerGameStateWithVirtuals : undefined,
        // Include sendChatMessage function for GM clients
        sendChatMessage: isGM && handlerRegistration ? 
          (message: string, metadata?: { type?: 'text' | 'roll'; rollData?: unknown; recipient?: 'public' | 'gm' | 'private'; }) => {
            handlerRegistration.pluginContext.sendChatMessage(message, metadata);
          } : undefined,
        // Include requestAction function when plugin context is available
        requestAction: handlerRegistration ? 
          (actionType: string, actorId: string | undefined, parameters: Record<string, unknown>, actorTokenId?: string, targetTokenIds?: string[], options?: { description?: string }) => {
            return handlerRegistration.pluginContext.requestAction(actionType, actorId, parameters, actorTokenId, targetTokenIds, options);
          } : undefined,
        // Include requestRoll function for sending damage roll requests
        requestRoll: handlerRegistration ? 
          (playerId: string, rollRequest: RollRequest) => {
            console.log('[RollHandlerService] Sending roll request:', { playerId, rollRequest });
            handlerRegistration.pluginContext.sendRollRequest(playerId, rollRequest);
          } : undefined
      };

      console.log('[RollHandlerService] Handler context:', {
        isGM: context.isGM,
        userId: context.userId,
        rollFrom: result.userId
      });
      
      if (handlerRegistration) {
        // Check if handler supports the new processRoll method
        if (handlerRegistration.handler.processRoll && typeof handlerRegistration.handler.processRoll === 'function') {
          console.log('[RollHandlerService] Using new functional processRoll approach');
          
          // Use the new functional approach - process roll FIRST
          const processed = await handlerRegistration.handler.processRoll(result, context);
          
          // Update processedResult with enhanced data from plugin processing
          // This allows promises to resolve with processed D&D results instead of raw dice
          processedResult = {
            ...processed.rollResult, // Use the enhanced roll result from plugin processing
            // Ensure we preserve the original rollId for promise correlation
            rollId: result.rollId
          };
          
          console.log('[RollHandlerService] Plugin processed roll result:', {
            rollType: result.rollType,
            followUpActions: processed.followUpActions.length,
            hasCalculatedTotal: processed.rollResult.calculatedTotal !== undefined,
            isCriticalHit: processed.rollResult.isCriticalHit,
            processedData: processed.rollResult.processedData ? Object.keys(processed.rollResult.processedData) : []
          });
          
          // Execute follow-up actions returned by processRoll
          for (const action of processed.followUpActions) {
            try {
              if (action.type === 'chat-message') {
                const chatAction = action as FollowUpChatMessage;
                if (context.sendChatMessage) {
                  context.sendChatMessage(chatAction.data.message, chatAction.data.options);
                  console.log('[RollHandlerService] Executed chat message:', chatAction.data.message);
                }
              } else if (action.type === 'roll-request') {
                const rollAction = action as FollowUpRollRequest;
                if (context.requestRoll) {
                  const rollRequest: RollRequest = {
                    rollId: `followup-${Date.now()}`,
                    message: rollAction.data.rollData.message || 'Follow-up roll',
                    rollType: rollAction.data.rollType,
                    dice: rollAction.data.rollData.dice,
                    metadata: rollAction.data.rollData.metadata
                  };
                  context.requestRoll(rollAction.data.playerId, rollRequest);
                  console.log('[RollHandlerService] Executed roll request:', rollAction.data.rollType);
                }
              } else if (action.type === 'action-request') {
                const actionRequest = action as FollowUpActionRequest;
                if (context.requestAction) {
                  // Extract actorId from parameters or use result metadata
                  // TODO: Update FollowUpActionRequest interface to include actorId, actorTokenId, targetTokenIds
                  const actorId = (actionRequest.data.parameters as any).actorId || result.metadata.actorId || '';
                  const actorTokenId = (actionRequest.data.parameters as any).actorTokenId || result.metadata.actorTokenId;
                  const targetTokenIds = (actionRequest.data.parameters as any).targetTokenIds;
                  
                  await context.requestAction(
                    actionRequest.data.actionType,
                    actorId,
                    actionRequest.data.parameters,
                    actorTokenId,
                    targetTokenIds,
                    actionRequest.data.options
                  );
                  console.log('[RollHandlerService] Executed action request:', actionRequest.data.actionType);
                }
              }
            } catch (error) {
              console.error('[RollHandlerService] Error executing follow-up action:', error, action);
            }
          }
        } else {
          console.warn('[RollHandlerService] Handler does not support processRoll - using default processing');
          
          // Handler doesn't support new functional approach - treat as if no handler
          processedResult = this.defaultHandler(result);
        }
      } else {
        // Use default handler - adds convenience total to results
        processedResult = this.defaultHandler(result);
      }
      
      // AFTER plugin processing, notify RollRequestService to resolve promises
      // This ensures spell casting handlers receive processed results with hit/miss/damage info
      if (this.rollRequestService) {
        console.log('[RollHandlerService] About to resolve promises with processed result:', {
          originalRollId: result.rollId,
          processedRollId: processedResult.rollId,
          rollType: processedResult.rollType,
          hasProcessedMetadata: !!processedResult.metadata,
          rollIdsMatch: result.rollId === processedResult.rollId
        });
        
        if (result.rollId !== processedResult.rollId) {
          console.error('[RollHandlerService] CRITICAL: Roll ID changed during processing!', {
            original: result.rollId,
            processed: processedResult.rollId
          });
        }
        
        this.rollRequestService.handleRollResult(processedResult);
      } else {
        console.log('[RollHandlerService] No RollRequestService registered');
      }
    } catch (error) {
      console.error('[RollHandlerService] Error processing roll result:', error);
    }
  }

  /**
   * Default handler for roll types without specific handlers
   * Adds convenience total calculation to roll results
   */
  private defaultHandler(result: RollServerResult): RollServerResult {
    console.log('[RollHandlerService] Default handler - Roll received:', {
      rollType: result.rollType,
      title: result.metadata.title,
      dice: result.results,
      timestamp: result.timestamp
    });

    // Calculate total from all dice results for convenience
    const total = result.results.reduce((sum, diceGroup) => 
      sum + diceGroup.results.reduce((groupSum, roll) => groupSum + roll, 0), 0
    );
    
    // Add total to result for action handler convenience
    const enhancedResult = {
      ...result,
      calculatedTotal: total
    } as RollServerResult & { calculatedTotal: number };
    
    console.log('[RollHandlerService] Added convenience total to roll result:', {
      rollType: result.rollType,
      originalRollId: result.rollId,
      enhancedRollId: enhancedResult.rollId,
      rollIdPreserved: result.rollId === enhancedResult.rollId,
      total: total
    });

    // For raw-dice rolls (chat commands), create a simple chat message if GM
    if (result.rollType === 'raw-dice') {
      const gameSessionStore = useGameSessionStore();
      const chatStore = useChatStore();
      const isGM = gameSessionStore.isGameMaster;
      
      if (isGM) {
        // Use the calculated total from above
        const modifier = result.arguments.customModifier;
        const finalTotal = total + modifier;
        
        // Create dice breakdown
        const diceBreakdown = result.results.map(diceGroup => 
          `${diceGroup.quantity}d${diceGroup.sides}: ${diceGroup.results.join(', ')}`
        ).join(' + ');
        
        const modifierText = modifier !== 0 ? ` ${modifier >= 0 ? '+' : ''}${modifier}` : '';
        const rollMessage = `**${result.metadata.title}**: ${diceBreakdown}${modifierText} = **${finalTotal}**`;
        
        console.log('[RollHandlerService] GM sending raw dice chat message:', rollMessage);
        chatStore.sendMessage(rollMessage);
      }
    }
    
    return enhancedResult;
  }

  /**
   * Cleanup when service is destroyed
   */
  destroy(): void {
    if (this.socket) {
      this.socket.off('roll:result');
      this.socket = null;
    }
    this.handlers.clear();
    console.log('[RollHandlerService] Service destroyed');
  }
}

// Create singleton instance
export const rollHandlerService = new RollHandlerService();