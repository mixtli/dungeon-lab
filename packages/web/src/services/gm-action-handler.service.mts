/**
 * GM Action Handler Service
 * 
 * Handles incoming GameActionRequests routed from the server to the GM client.
 * Performs validation and either approves (via gameState:update) or denies requests.
 */

import { 
  type GameActionRequest, 
  type MoveTokenParameters,
  type RemoveTokenParameters,
  type AddDocumentParameters,
  type StartEncounterParameters,
  type StopEncounterParameters,
  type EncounterStartCallback,
  type EncounterStopCallback
} from '@dungeon-lab/shared/types/index.mjs';
import { turnManagerService } from './turn-manager.service.mjs';
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
      case 'remove-token':
        this.handleTokenRemoval(request);
        break;
      case 'add-document':
        this.handleDocumentAddition(request);
        break;
      case 'end-turn':
        this.handleEndTurn(request);
        break;
      case 'roll-initiative':
        this.handleRollInitiative(request);
        break;
      case 'start-encounter':
        this.handleStartEncounter(request);
        break;
      case 'stop-encounter':
        this.handleStopEncounter(request);
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
   * Handle token removal validation and execution
   */
  private async handleTokenRemoval(request: GameActionRequest) {
    const params = request.parameters as RemoveTokenParameters;
    
    console.log('[GMActionHandler] Processing token removal:', {
      tokenId: params.tokenId,
      tokenName: params.tokenName
    });

    try {
      // Validate we have an active encounter
      if (!this.gameStateStore.currentEncounter) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NO_ACTIVE_ENCOUNTER',
            message: 'No active encounter for token removal'
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

      // Permission check - GM can always remove tokens
      const isGM = request.playerId === this.gameSessionStore.currentSession?.gameMasterId;
      
      if (!isGM) {
        // Players can only request removal of their own tokens
        // For now, deny all non-GM requests to maintain GM authority
        console.log('[GMActionHandler] Non-GM attempted token removal, denying request:', {
          playerId: request.playerId,
          tokenId: params.tokenId
        });
        
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Only the Game Master can remove tokens'
          }
        });
      }

      // Token removal is valid - execute via game state update
      const operations = [{
        path: 'currentEncounter.tokens',
        operation: 'pull' as const,
        value: { id: params.tokenId } // MongoDB pull syntax to remove by ID
      }];

      // Execute the game state update
      const updateResult = await this.gameStateStore.updateGameState(operations);
      
      if (updateResult.success) {
        console.log('[GMActionHandler] Token removal approved and executed:', {
          tokenId: params.tokenId,
          tokenName: params.tokenName
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
      console.error('[GMActionHandler] Error processing token removal:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'REMOVAL_ERROR',
          message: 'Failed to process token removal'
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
   * Handle end turn requests from players
   */
  private async handleEndTurn(request: GameActionRequest) {
    console.log('[GMActionHandler] Processing end turn request from:', request.playerId);
    console.log('[GMActionHandler] Current game state:', {
      hasTurnManager: !!this.gameStateStore.gameState?.turnManager,
      isActive: this.gameStateStore.gameState?.turnManager?.isActive,
      currentTurn: this.gameStateStore.gameState?.turnManager?.currentTurn,
      round: this.gameStateStore.gameState?.turnManager?.round,
      participantCount: this.gameStateStore.gameState?.turnManager?.participants?.length
    });

    try {
      // Check if we have active turn order
      if (!this.gameStateStore.gameState?.turnManager?.isActive) {
        console.log('[GMActionHandler] No active turn order, rejecting end turn request');
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NO_ACTIVE_TURN_ORDER',
            message: 'No active turn order'
          }
        });
      }

      const turnManager = this.gameStateStore.gameState.turnManager;
      const currentParticipant = turnManager.participants[turnManager.currentTurn];

      console.log('[GMActionHandler] Current turn state:', {
        currentParticipant: currentParticipant ? {
          tokenId: currentParticipant.tokenId,
          actorId: currentParticipant.actorId,
          hasActed: currentParticipant.hasActed
        } : null,
        currentTurn: turnManager.currentTurn,
        round: turnManager.round
      });

      // Permission check: GM can always end turns, current player can end their own turn
      const isGM = request.playerId === this.gameSessionStore.currentSession?.gameMasterId;
      const isCurrentPlayerTurn = await this.isPlayerOwnsTurnParticipant(request.playerId, currentParticipant);

      console.log('[GMActionHandler] Permission check:', {
        isGM,
        isCurrentPlayerTurn,
        requestPlayerId: request.playerId,
        gmUserId: this.gameSessionStore.currentSession?.gameMasterId
      });

      if (!isGM && !isCurrentPlayerTurn) {
        console.log('[GMActionHandler] Permission denied for end turn request');
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NOT_YOUR_TURN',
            message: 'You can only end your own turn'
          }
        });
      }

      console.log('[GMActionHandler] End turn request authorized, executing turn advancement');

      // Execute the turn advancement using the turn manager service
      // Since we're in the GM client, this will work correctly
      try {
        console.log('[GMActionHandler] Calling turnManagerService.nextTurn()...');
        const continued = await turnManagerService.nextTurn();
        console.log('[GMActionHandler] turnManagerService.nextTurn() completed successfully:', { continued });

        const response = {
          success: true,
          approved: true,
          requestId: request.id
        };

        console.log('[GMActionHandler] Turn ended successfully, sending response:', {
          continued,
          requestId: request.id,
          response
        });

        this.socketStore.emit('gameAction:response', response);

      } catch (turnError) {
        console.error('[GMActionHandler] Error during turn advancement:', turnError);
        this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'TURN_ADVANCEMENT_FAILED',
            message: `Failed to advance turn: ${turnError instanceof Error ? turnError.message : 'Unknown error'}`
          }
        });
      }

    } catch (error) {
      console.error('[GMActionHandler] Error processing end turn:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'END_TURN_ERROR',
          message: `Failed to process end turn request: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }
  }

  /**
   * Handle roll initiative requests from players
   */
  private async handleRollInitiative(request: GameActionRequest) {
    console.log('[GMActionHandler] Processing roll initiative request from:', request.playerId);

    try {
      // Check if we have active turn order
      if (!this.gameStateStore.gameState?.turnManager?.isActive) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NO_ACTIVE_TURN_ORDER',
            message: 'No active turn order'
          }
        });
      }

      // For now, only allow GM to reroll initiative
      // In the future, we might allow players to reroll their own initiative
      const isGM = request.playerId === this.gameSessionStore.currentSession?.gameMasterId;
      if (!isGM) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'GM_ONLY_ACTION',
            message: 'Only the GM can reroll initiative'
          }
        });
      }

      console.log('[GMActionHandler] Roll initiative request authorized, executing');

      // Execute the initiative recalculation using the turn manager service
      await turnManagerService.recalculateInitiative();

      const response = {
        success: true,
        approved: true,
        requestId: request.id
      };

      console.log('[GMActionHandler] Initiative rolled successfully:', {
        requestId: request.id
      });

      this.socketStore.emit('gameAction:response', response);

    } catch (error) {
      console.error('[GMActionHandler] Error processing roll initiative:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'ROLL_INITIATIVE_ERROR',
          message: 'Failed to process roll initiative request'
        }
      });
    }
  }

  /**
   * Handle start encounter requests
   */
  private async handleStartEncounter(request: GameActionRequest) {
    const params = request.parameters as StartEncounterParameters;
    
    console.log('[GMActionHandler] Processing start encounter request:', {
      encounterId: params.encounterId,
      playerId: request.playerId
    });

    try {
      // Only GM can start encounters
      const isGM = request.playerId === this.gameSessionStore.currentSession?.gameMasterId;
      if (!isGM) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'GM_ONLY_ACTION',
            message: 'Only the Game Master can start encounters'
          }
        });
      }

      // Check if there's already an active encounter
      if (this.gameStateStore.currentEncounter) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'ENCOUNTER_ALREADY_ACTIVE',
            message: 'An encounter is already active'
          }
        });
      }

      // Call the server-side encounter:start handler
      this.socketStore.socket?.emit('encounter:start', { encounterId: params.encounterId }, (response: EncounterStartCallback) => {
        if (response.success && response.data) {
          // Server returned the encounter data, now set it in game state
          console.log('[GMActionHandler] Server approved encounter start, updating game state');
          
          const operations = [{
            path: 'currentEncounter',
            operation: 'set' as const,
            value: response.data
          }];

          this.gameStateStore.updateGameState(operations).then((updateResult) => {
            if (updateResult.success) {
              console.log('[GMActionHandler] Encounter start completed successfully');
              this.socketStore.emit('gameAction:response', {
                success: true,
                approved: true,
                requestId: request.id
              });
            } else {
              console.error('[GMActionHandler] Failed to update game state after encounter start');
              this.socketStore.emit('gameAction:response', {
                success: false,
                requestId: request.id,
                error: {
                  code: 'STATE_UPDATE_FAILED',
                  message: updateResult.error?.message || 'Failed to update game state'
                }
              });
            }
          });
        } else {
          console.error('[GMActionHandler] Server rejected encounter start:', response.error);
          this.socketStore.emit('gameAction:response', {
            success: false,
            requestId: request.id,
            error: response.error 
              ? (typeof response.error === 'string' 
                  ? { code: 'ENCOUNTER_START_FAILED', message: response.error } 
                  : response.error)
              : { code: 'ENCOUNTER_START_FAILED', message: 'Failed to start encounter' }
          });
        }
      });

    } catch (error) {
      console.error('[GMActionHandler] Error processing start encounter:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'START_ENCOUNTER_ERROR',
          message: 'Failed to process start encounter request'
        }
      });
    }
  }

  /**
   * Handle stop encounter requests
   */
  private async handleStopEncounter(request: GameActionRequest) {
    const params = request.parameters as StopEncounterParameters;
    
    console.log('[GMActionHandler] Processing stop encounter request:', {
      encounterId: params.encounterId,
      playerId: request.playerId
    });

    try {
      // Only GM can stop encounters
      const isGM = request.playerId === this.gameSessionStore.currentSession?.gameMasterId;
      if (!isGM) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'GM_ONLY_ACTION',
            message: 'Only the Game Master can stop encounters'
          }
        });
      }

      // Check if there's an active encounter to stop
      if (!this.gameStateStore.currentEncounter) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'NO_ACTIVE_ENCOUNTER',
            message: 'No encounter is currently active'
          }
        });
      }

      // Verify the encounter ID matches
      if (this.gameStateStore.currentEncounter.id !== params.encounterId) {
        return this.socketStore.emit('gameAction:response', {
          success: false,
          requestId: request.id,
          error: {
            code: 'ENCOUNTER_MISMATCH',
            message: 'The specified encounter is not the currently active encounter'
          }
        });
      }

      // Call the server-side encounter:stop handler
      this.socketStore.socket?.emit('encounter:stop', { encounterId: params.encounterId }, (response: EncounterStopCallback) => {
        if (response.success) {
          // Server approved the stop, now clear currentEncounter from game state
          console.log('[GMActionHandler] Server approved encounter stop, clearing game state');
          
          const operations = [{
            path: 'currentEncounter',
            operation: 'unset' as const
          }];

          this.gameStateStore.updateGameState(operations).then((updateResult) => {
            if (updateResult.success) {
              console.log('[GMActionHandler] Encounter stop completed successfully');
              this.socketStore.emit('gameAction:response', {
                success: true,
                approved: true,
                requestId: request.id
              });
            } else {
              console.error('[GMActionHandler] Failed to update game state after encounter stop');
              this.socketStore.emit('gameAction:response', {
                success: false,
                requestId: request.id,
                error: {
                  code: 'STATE_UPDATE_FAILED',
                  message: updateResult.error?.message || 'Failed to update game state'
                }
              });
            }
          });
        } else {
          console.error('[GMActionHandler] Server rejected encounter stop:', response.error);
          this.socketStore.emit('gameAction:response', {
            success: false,
            requestId: request.id,
            error: response.error 
              ? (typeof response.error === 'string' 
                  ? { code: 'ENCOUNTER_STOP_FAILED', message: response.error } 
                  : response.error)
              : { code: 'ENCOUNTER_STOP_FAILED', message: 'Failed to stop encounter' }
          });
        }
      });

    } catch (error) {
      console.error('[GMActionHandler] Error processing stop encounter:', error);
      this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: {
          code: 'STOP_ENCOUNTER_ERROR',
          message: 'Failed to process stop encounter request'
        }
      });
    }
  }

  /**
   * Check if a player owns the current turn participant
   */
  private async isPlayerOwnsTurnParticipant(playerId: string, participant: { tokenId?: string; actorId?: string }): Promise<boolean> {
    // Check if the player owns the document associated with this participant's token
    const token = this.gameStateStore.currentEncounter?.tokens?.find(t => t.id === participant.tokenId);
    if (!token) return false;

    // Find the document that created this token
    const document = this.gameStateStore.characters.find(c => c.id === token.documentId) ||
                     this.gameStateStore.actors.find(a => a.id === token.documentId);

    return document?.createdBy === playerId;
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