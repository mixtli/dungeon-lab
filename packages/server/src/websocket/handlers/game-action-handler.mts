import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { SocketServer } from '../socket-server.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { CampaignService } from '../../features/campaigns/services/campaign.service.mjs';
import { logger } from '../../utils/logger.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/index.mjs';
import { 
  GameActionRequest, 
  ActionRequestResponse 
} from '@dungeon-lab/shared/types/game-actions.mjs';

// Store pending callbacks by request ID
const pendingCallbacks = new Map<string, {
  callback: (response: ActionRequestResponse) => void;
  timeout: NodeJS.Timeout;
  timestamp: number;
}>();

/**
 * Game Action Handler for routing player action requests to GM client
 * Server acts as a simple message router - all validation happens in GM client
 */
function gameActionHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const campaignService = new CampaignService();

  /**
   * Route game action requests from players to GM client
   */
  socket.on('gameAction:request', async (request: GameActionRequest, callback: (response: ActionRequestResponse) => void) => {
    console.log('[GameActionHandler] Handler called with request:', request);
    logger.debug('[GameActionHandler] Routing action request to GM:', { 
      action: request.action, 
      playerId: request.playerId, 
      sessionId: request.sessionId 
    });

    try {
      // Find the session and GM
      const session = await GameSessionModel.findById(request.sessionId).exec();
      if (!session) {
        return callback({
          success: false,
          requestId: request.id,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Game session not found'
          }
        });
      }

      // Verify user is authorized for this session (GM or has character in campaign)
      const isGM = session.gameMasterId === request.playerId;
      const hasCharacterInCampaign = await campaignService.isUserCampaignMember(request.playerId, session.campaignId);
      
      if (!isGM && !hasCharacterInCampaign) {
        return callback({
          success: false,
          requestId: request.id,
          error: {
            code: 'PERMISSION_DENIED',
            message: 'User is not a participant in this session'
          }
        });
      }

      // Find GM socket and forward request
      const io = SocketServer.getInstance().socketIo;
      const gmSocketId = findGMSocketForSession(session.gameMasterId, request.sessionId);
      
      if (!gmSocketId) {
        return callback({
          success: false,
          requestId: request.id,
          error: {
            code: 'GM_NOT_CONNECTED',
            message: 'Game Master is not currently connected'
          }
        });
      }

      // Store callback for later execution when GM responds
      const timeout = setTimeout(() => {
        const pendingRequest = pendingCallbacks.get(request.id);
        if (pendingRequest) {
          logger.warn('[GameActionHandler] Request timeout:', { requestId: request.id });
          pendingRequest.callback({
            success: false,
            requestId: request.id,
            error: {
              code: 'REQUEST_TIMEOUT',
              message: 'GM did not respond within 30 seconds'
            }
          });
          pendingCallbacks.delete(request.id);
        }
      }, 30000); // 30 second timeout

      pendingCallbacks.set(request.id, {
        callback,
        timeout,
        timestamp: Date.now()
      });

      // Forward request to GM client without callback
      io.to(gmSocketId).emit('gameAction:forward', request);

    } catch (error) {
      logger.error('[GameActionHandler] Error routing action request:', error);
      callback({
        success: false,
        requestId: request.id,
        error: {
          code: 'ROUTING_ERROR',
          message: 'Failed to route request to GM'
        }
      });
    }
  });

  /**
   * Handle GM responses and call stored callbacks
   */
  socket.on('gameAction:response', (response: ActionRequestResponse) => {
    console.log('[GameActionHandler] GM response received:', response);
    logger.debug('[GameActionHandler] Processing GM response:', { 
      requestId: response.requestId, 
      success: response.success 
    });

    const pendingRequest = pendingCallbacks.get(response.requestId);
    if (pendingRequest) {
      // Clear timeout and call original callback
      clearTimeout(pendingRequest.timeout);
      pendingRequest.callback(response);
      pendingCallbacks.delete(response.requestId);
      
      logger.debug('[GameActionHandler] Callback executed for request:', response.requestId);
    } else {
      logger.warn('[GameActionHandler] Received response for unknown request:', response.requestId);
    }
  });

  /**
   * Clean up pending callbacks when socket disconnects
   */
  socket.on('disconnect', () => {
    // Find any pending requests from this socket and clean them up
    const socketsToCleanup: string[] = [];
    
    for (const [requestId, pendingRequest] of pendingCallbacks.entries()) {
      // We can't easily track which socket made which request, so we'll rely on timeouts
      // But we can clean up requests older than a reasonable threshold on any disconnect
      const age = Date.now() - pendingRequest.timestamp;
      if (age > 60000) { // Clean up requests older than 1 minute
        clearTimeout(pendingRequest.timeout);
        socketsToCleanup.push(requestId);
      }
    }
    
    socketsToCleanup.forEach(requestId => {
      pendingCallbacks.delete(requestId);
    });
    
    if (socketsToCleanup.length > 0) {
      logger.debug('[GameActionHandler] Cleaned up stale requests on disconnect:', socketsToCleanup.length);
    }
  });

  /**
   * Find GM socket ID for a given session
   */
  function findGMSocketForSession(gmUserId: string, sessionId: string): string | null {
    const io = SocketServer.getInstance().socketIo;
    
    // Look through all connected sockets to find the GM
    for (const [socketId, socket] of io.sockets.sockets) {
      // Check if this socket belongs to the GM user and is in the session room
      if (socket.userId === gmUserId && socket.rooms.has(`session:${sessionId}`)) {
        return socketId;
      }
    }
    
    return null;
  }
}

// Register the handler
socketHandlerRegistry.register(gameActionHandler);

export { gameActionHandler };