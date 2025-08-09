/**
 * GM Action Handler Service
 * 
 * Handles incoming GameActionRequests routed from the server to the GM client.
 * Performs validation and either approves (via gameState:update) or denies requests.
 */

import { 
  type GameActionRequest, 
  type MoveTokenParameters,
  type AddDocumentParameters
} from '@dungeon-lab/shared/types/index.mjs';
import { useGameSessionStore } from '../stores/game-session.store.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import { useSocketStore } from '../stores/socket.store.mjs';
import { checkWallCollision } from '../utils/collision-detection.mjs';
import { MapsClient } from '@dungeon-lab/client/index.mjs';
import type { IMapResponse } from '@dungeon-lab/shared/types/api/maps.mjs';

/**
 * GM Action Handler Service - processes action requests sent to GM client
 */
export class GMActionHandlerService {
  private mapsClient = new MapsClient();
  private mapCache = new Map<string, IMapResponse>();
  
  // Request deduplication to prevent race conditions
  private processedRequests = new Set<string>();
  private requestCleanupTimeout = 30000; // Clean up after 30 seconds

  // Lazy-loaded stores to avoid initialization order issues
  private get gameSessionStore() {
    return useGameSessionStore();
  }

  private get gameStateStore() {
    return useGameStateStore();
  }

  private get socketStore() {
    return useSocketStore();
  }

  /**
   * Initialize the GM action handler - sets up socket listeners
   */
  init() {
    console.log('[GMActionHandler] Initializing GM action handler');
    
    // Only GMs should handle these requests
    if (!this.gameSessionStore.isGameMaster) {
      return;
    }

    // Listen for action requests routed from server
    this.socketStore.socket?.on('gameAction:forward', this.handleActionRequest.bind(this));
  }

  /**
   * Handle incoming action requests from server
   */
  private handleActionRequest(request: GameActionRequest) {
    console.log('[GMActionHandler] Received action request:', {
      action: request.action,
      playerId: request.playerId,
      requestId: request.id
    });

    // Check for duplicate request to prevent race condition
    if (this.processedRequests.has(request.id)) {
      console.log('[GMActionHandler] Ignoring duplicate request:', request.id);
      return;
    }

    // Mark request as processed
    this.processedRequests.add(request.id);
    
    // Schedule cleanup to prevent memory leaks
    setTimeout(() => {
      this.processedRequests.delete(request.id);
    }, this.requestCleanupTimeout);

    // Route to appropriate handler
    switch (request.action) {
      case 'move-token':
        this.handleTokenMovement(request);
        break;
      case 'add-document':
        this.handleDocumentAddition(request);
        break;
      default:
        this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action type: ${request.action}`
          }
        });
    }
  }

  /**
   * Handle token movement validation and execution
   */
  private async handleTokenMovement(request: GameActionRequest) {
    const params = request.parameters as MoveTokenParameters;
    
    console.log('[GMActionHandler] Processing token movement:', {
      tokenId: params.tokenId,
      newPosition: params.newPosition
    });

    try {
      // Validate we have an active encounter
      if (!this.gameStateStore.currentEncounter) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NO_ACTIVE_ENCOUNTER',
            message: 'No active encounter for token movement'
          }
        });
      }

      // Find the token
      const token = this.gameStateStore.currentEncounter.tokens?.find(t => t.id === params.tokenId);
      if (!token) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'TOKEN_NOT_FOUND',
            message: 'Token not found in current encounter'
          }
        });
      }

      // Permission check - players can only move player-controlled tokens
      if (!this.gameSessionStore.isGameMaster && token.isPlayerControlled) {
        // For now, allow all player-controlled token movement
        // TODO: Add proper ownership checking when we have user-character linkage
        console.log('[GMActionHandler] Player moving player-controlled token:', {
          playerId: request.playerId,
          tokenId: params.tokenId,
          tokenName: token.name
        });
      }

      // Collision detection using game state map data
      if (this.gameStateStore.currentEncounter?.currentMap) {
        const currentPos = { x: token.position.x, y: token.position.y };
        const targetPos = { x: params.newPosition.x, y: params.newPosition.y };
        
        try {
          const mapData = this.gameStateStore.currentEncounter.currentMap;
          console.log('[GMActionHandler] Using map data from game state for collision detection');
          
          if (checkWallCollision(currentPos, targetPos, mapData)) {
            console.log('[GMActionHandler] Movement blocked by collision detection');
            return this.socketStore.emit('gameAction:response', {
              success: false,
              requestId: request.id,
              error: {
                code: 'COLLISION_DETECTED',
                message: 'Movement blocked by wall or obstacle'
              }
            });
          }
        } catch (error) {
          console.warn('[GMActionHandler] Error during collision detection:', error);
        }
      } else {
        console.log('[GMActionHandler] No currentMap in game state, skipping collision detection');
        
        // Fallback: try to get map from mapId if currentMap is not available
        if (this.gameStateStore.currentEncounter?.mapId) {
          console.log('[GMActionHandler] Falling back to REST API for map data');
          const currentPos = { x: token.position.x, y: token.position.y };
          const targetPos = { x: params.newPosition.x, y: params.newPosition.y };
          
          try {
            const mapData = await this.getMapData(this.gameStateStore.currentEncounter.mapId);
            
            if (checkWallCollision(currentPos, targetPos, mapData)) {
              console.log('[GMActionHandler] Movement blocked by collision detection (fallback)');
              return this.socketStore.emit('gameAction:response', {
                success: false,
                requestId: request.id,
                error: {
                  code: 'COLLISION_DETECTED',
                  message: 'Movement blocked by wall or obstacle'
                }
              });
            }
          } catch (error) {
            console.warn('[GMActionHandler] Fallback map loading failed, allowing movement:', error);
          }
        }
      }

      // Movement is valid - execute via game state update
      const tokenIndex = this.gameStateStore.currentEncounter.tokens?.findIndex(t => t.id === params.tokenId);
      if (tokenIndex === undefined || tokenIndex === -1) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'TOKEN_INDEX_ERROR',
            message: 'Could not locate token for update'
          }
        });
      }

      const operations = [
        {
          path: `currentEncounter.tokens.${tokenIndex}.position`,
          operation: 'set' as const,
          value: {
            x: params.newPosition.x,
            y: params.newPosition.y,
            elevation: params.newPosition.elevation || token.position.elevation || 0
          }
        }
      ];

      // Execute the game state update
      const updateResult = await this.gameStateStore.updateGameState(operations);
      
      if (updateResult.success) {
        console.log('[GMActionHandler] Token movement approved and executed:', {
          tokenId: params.tokenId,
          newPosition: params.newPosition
        });
        
        const response = {
          success: true,
          approved: true,
          requestId: request.id
        };
        console.log('[GMActionHandler] Sending response via socket:', response);
        this.socketStore.emit('gameAction:response', response);
      } else {
        this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'STATE_UPDATE_FAILED',
            message: updateResult.error?.message || 'Failed to update game state'
          }
        });
      }

    } catch (error) {
      console.error('[GMActionHandler] Error processing token movement:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'MOVEMENT_ERROR',
          message: 'Failed to process token movement'
        }
      });
    }
  }

  /**
   * Handle document addition validation and execution
   */
  private async handleDocumentAddition(request: GameActionRequest) {
    const params = request.parameters as AddDocumentParameters;
    
    console.log('[GMActionHandler] Processing document addition:', {
      entryId: params.entryId,
      documentType: params.documentData?.documentType,
      documentName: params.documentData?.name
    });

    try {
      // Validate we have a current session
      if (!this.gameSessionStore.currentSession) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NO_ACTIVE_SESSION',
            message: 'No active session for document addition'
          }
        });
      }

      // Validate document data
      if (!params.documentData || typeof params.documentData !== 'object') {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'INVALID_DOCUMENT_DATA',
            message: 'Invalid or missing document data'
          }
        });
      }

      const document = params.documentData;
      const documentType = document.documentType as string;

      // Validate document type
      if (!['character', 'actor', 'item', 'vtt-document'].includes(documentType)) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'UNSUPPORTED_DOCUMENT_TYPE',
            message: `Unsupported document type: ${documentType}`
          }
        });
      }

      // Check if GM is making the request (auto-approve)
      const isGMRequest = request.playerId === this.gameSessionStore.currentSession?.gameMasterId;
      
      if (isGMRequest) {
        console.log('[GMActionHandler] GM is requesting document addition, auto-approving');
        await this.executeDocumentAddition(document, documentType, request.id);
      } else {
        console.log('[GMActionHandler] Player requesting document addition, checking permissions');
        
        // For now, allow players to add their own characters but require GM approval for other types
        if (documentType === 'character') {
          console.log('[GMActionHandler] Auto-approving character addition from player');
          await this.executeDocumentAddition(document, documentType, request.id);
        } else {
          // TODO: Implement GM approval dialog in chat
          console.log('[GMActionHandler] Non-character document requires GM approval - for now, auto-approving');
          await this.executeDocumentAddition(document, documentType, request.id);
        }
      }

    } catch (error) {
      console.error('[GMActionHandler] Error processing document addition:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'DOCUMENT_ADDITION_ERROR',
          message: 'Failed to process document addition'
        }
      });
    }
  }

  /**
   * Execute the document addition to game state
   */
  private async executeDocumentAddition(
    document: Record<string, unknown>, 
    documentType: string, 
    requestId: string
  ): Promise<void> {
    try {
      // Determine the collection path based on document type
      let collectionPath: string;
      switch (documentType) {
        case 'character':
          collectionPath = 'characters';
          break;
        case 'actor':
          collectionPath = 'actors';
          break;
        case 'item':
          collectionPath = 'items';
          break;
        case 'vtt-document':
          collectionPath = 'vttDocuments';
          break;
        default:
          throw new Error(`Unsupported document type: ${documentType}`);
      }

      // Create state operation to add the document
      const operations = [{
        path: collectionPath,
        operation: 'push' as const,
        value: document
      }];

      console.log('[GMActionHandler] Executing document addition with operation:', {
        path: collectionPath,
        documentName: document.name
      });

      // Execute the game state update
      const updateResult = await this.gameStateStore.updateGameState(operations);
      
      if (updateResult.success) {
        console.log('[GMActionHandler] Document addition approved and executed:', {
          documentType,
          documentName: document.name
        });
        
        const response = {
          success: true,
          approved: true,
          requestId: requestId
        };
        console.log('[GMActionHandler] Sending response via socket:', response);
        this.socketStore.emit('gameAction:response', response);
      } else {
        this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: requestId,
          error: {
            code: 'STATE_UPDATE_FAILED',
            message: updateResult.error?.message || 'Failed to update game state'
          }
        });
      }

    } catch (error) {
      console.error('[GMActionHandler] Error executing document addition:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: requestId,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute document addition'
        }
      });
    }
  }

  /**
   * Get map data with caching
   */
  private async getMapData(mapId: string): Promise<IMapResponse> {
    // Check cache first
    if (this.mapCache.has(mapId)) {
      return this.mapCache.get(mapId)!;
    }

    // Load from API
    console.log('[GMActionHandler] Loading map data for collision detection:', mapId);
    const mapData = await this.mapsClient.getMap(mapId);
    
    // Cache it
    this.mapCache.set(mapId, mapData);
    
    return mapData;
  }

  /**
   * Cleanup - remove socket listeners
   */
  destroy() {
    console.log('[GMActionHandler] Destroying GM action handler');
    this.socketStore.socket?.off('gameAction:forward');
    this.mapCache.clear();
  }
}

// Singleton instance
export const gmActionHandlerService = new GMActionHandlerService();