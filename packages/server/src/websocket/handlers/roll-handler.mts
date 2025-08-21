import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { SocketServer } from '../socket-server.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { logger } from '../../utils/logger.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';
import { 
  rollSchema,
  rollServerResultSchema,
  rollRequestSchema,
  type Roll,
  type RollCallback,
  type RollServerResult,
  type RollRequest
} from '@dungeon-lab/shared/schemas/roll.schema.mjs';

/**
 * Simple dice rolling function
 * Rolls dice and returns raw results - no game logic, just server-side randomness
 */
function rollDice(sides: number, quantity: number): number[] {
  const results: number[] = [];
  for (let i = 0; i < quantity; i++) {
    results.push(Math.floor(Math.random() * sides) + 1);
  }
  return results;
}

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

/**
 * Find player socket by user ID in a given session
 */
function findPlayerSocketInSession(playerId: string, sessionId: string): Socket<ClientToServerEvents, ServerToClientEvents> | null {
  const io = SocketServer.getInstance().socketIo;
  
  // Look through all connected sockets to find the player
  for (const [_socketId, socket] of io.sockets.sockets) {
    // Check if this socket belongs to the target player and is in the session room
    if (socket.userId === playerId && socket.rooms.has(`session:${sessionId}`)) {
      return socket;
    }
  }
  
  return null;
}

/**
 * Socket handler for roll events
 * Handles 'roll' events by performing server-side dice rolling
 */
function rollHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  const userId = socket.userId;

  /**
   * Handle roll event
   * 1. Validate the roll request
   * 2. Perform server-side dice rolling  
   * 3. Send results back to all relevant clients
   * 4. Return callback confirmation
   */
  socket.on('roll', async (...args) => {
    const [roll, callback] = args as [Roll, (response: RollCallback) => void];
    try {
      logger.info(`Roll requested by user ${userId} for plugin ${roll.pluginId}`);

      // Validate the roll data
      const validationResult = rollSchema.safeParse(roll);
      if (!validationResult.success) {
        const error = `Invalid roll data: ${validationResult.error.message}`;
        logger.warn(`Roll validation failed for user ${userId}:`, validationResult.error);
        callback?.({ success: false, error });
        return;
      }

      // Perform server-side dice rolling
      const diceResults = roll.dice.map(diceGroup => ({
        sides: diceGroup.sides,
        quantity: diceGroup.quantity,
        results: rollDice(diceGroup.sides, diceGroup.quantity)
      }));

      // Create server result
      const rollResult: RollServerResult = {
        ...roll,
        results: diceResults,
        userId,
        timestamp: new Date()
      };

      // Validate the result
      const resultValidation = rollServerResultSchema.safeParse(rollResult);
      if (!resultValidation.success) {
        const error = `Invalid roll result data: ${resultValidation.error.message}`;
        logger.error(`Roll result validation failed:`, resultValidation.error);
        callback?.({ success: false, error });
        return;
      }

      logger.info(`Roll completed for user ${userId}, plugin ${roll.pluginId}, type ${roll.rollType}`);

      // Emit roll result to appropriate recipients
      if (roll.recipients === 'public') {
        // Send to all clients in the game session
        if (socket.gameSessionId) {
          socket.to(`session:${socket.gameSessionId}`).emit('roll:result', rollResult);
          socket.emit('roll:result', rollResult); // Also send to the roller
        }
      } else if (roll.recipients === 'gm') {
        // Send only to GM clients in the session
        if (socket.gameSessionId) {
          // Find the session to get GM user ID
          const session = await GameSessionModel.findById(socket.gameSessionId).exec();
          if (session) {
            const gmSocketId = findGMSocketForSession(session.gameMasterId, socket.gameSessionId);
            if (gmSocketId) {
              const io = SocketServer.getInstance().socketIo;
              io.to(gmSocketId).emit('roll:result', rollResult);
            }
          }
          
          // If the roller is the GM, also send to them
          if (socket.isAdmin) {
            socket.emit('roll:result', rollResult);
          }
        }
      } else if (roll.recipients === 'private') {
        // Send only to the rolling client
        socket.emit('roll:result', rollResult);
      }

      // Chat messages will be sent by GM client handlers after calculating final results

      // Return success callback
      callback?.({ success: true });

    } catch (error) {
      logger.error('Error handling roll:', error);
      const errorResponse = error instanceof Error ? error.message : 'Failed to process roll';
      callback?.({ success: false, error: errorResponse });
    }
  });

  /**
   * Handle roll request events from GM to players
   * 1. Validate sender is GM
   * 2. Extract target player ID
   * 3. Route request to specific player socket
   * 4. Handle errors for missing/disconnected players
   */
  socket.on('roll:request', async (data: RollRequest & { playerId: string }) => {
    try {
      logger.info(`Roll request received from user ${userId} for player ${data.playerId}`);

      // Validate the roll request data
      const validationResult = rollRequestSchema.safeParse(data);
      if (!validationResult.success) {
        const error = `Invalid roll request data: ${validationResult.error.message}`;
        logger.warn(`Roll request validation failed for user ${userId}:`, validationResult.error);
        socket.emit('roll:request:error', {
          requestId: data.requestId,
          error
        });
        return;
      }

      // Validate that sender is GM of the session
      if (!socket.gameSessionId) {
        logger.warn(`Roll request from user ${userId} without active game session`);
        socket.emit('roll:request:error', {
          requestId: data.requestId,
          error: 'No active game session'
        });
        return;
      }

      // Get session to verify GM permissions
      const session = await GameSessionModel.findById(socket.gameSessionId).exec();
      if (!session || session.gameMasterId !== userId) {
        logger.warn(`Roll request from non-GM user ${userId} in session ${socket.gameSessionId}`);
        socket.emit('roll:request:error', {
          requestId: data.requestId,
          error: 'Only GMs can send roll requests'
        });
        return;
      }

      // Extract roll request and target player ID
      const { playerId, ...rollRequest } = data;
      
      // Find target player socket in the session
      const targetSocket = findPlayerSocketInSession(playerId, socket.gameSessionId);
      if (targetSocket) {
        // Forward roll request to target player
        targetSocket.emit('roll:request', rollRequest);
        logger.info(`Forwarded roll request to player ${playerId} in session ${socket.gameSessionId}`);
      } else {
        // Player not connected - send error back to GM
        logger.warn(`Player ${playerId} not connected for roll request in session ${socket.gameSessionId}`);
        socket.emit('roll:request:error', {
          requestId: rollRequest.requestId,
          error: 'Player not connected'
        });
      }

    } catch (error) {
      logger.error('Error handling roll request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process roll request';
      socket.emit('roll:request:error', {
        requestId: data.requestId || 'unknown',
        error: errorMessage
      });
    }
  });
}

// Register the socket handler
socketHandlerRegistry.register(rollHandler);

export default rollHandler;