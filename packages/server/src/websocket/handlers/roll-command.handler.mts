import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { UserModel } from '../../models/user.model.mjs';
import { DiceService } from '../../services/dice.service.mjs';
import { logger } from '../../utils/logger.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

// Create a singleton instance of the DiceService
const diceService = new DiceService();

/**
 * Socket handler for roll commands
 * @param socket The client socket connection
 */
function rollCommandHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  socket.on('roll', async (message, callback) => {
    logger.info('Received roll command:', {
      formula: message.formula,
      gameSessionId: message.gameSessionId,
      socketId: socket.id,
      userId: socket.userId
    });

    try {
      // Get the user ID from the socket
      const userId = socket.userId;
      if (!userId) {
        logger.warn('Roll command rejected: User not authenticated');
        throw new Error('User not authenticated');
      }

      // Verify the game session exists and user is a participant
      const gameSession = await GameSessionModel.findById(message.gameSessionId);
      if (!gameSession) {
        logger.warn('Roll command rejected: Game session not found');
        throw new Error('Game session not found');
      }

      if (!gameSession.participantIds.includes(userId)) {
        logger.warn('Roll command rejected: User not in session', {
          userId,
          sessionId: message.gameSessionId
        });
        throw new Error('Not authorized for this game session');
      }

      // Roll the dice - always use enhanced method for 3D visualization
      logger.debug('Rolling dice with formula:', message.formula);
      
      // Always use enhanced dice rolling for consistent 3D visualization
      const enhancedResult = diceService.rollDiceEnhanced(message.formula, userId);
      logger.debug('Enhanced roll result:', enhancedResult);

      // Create enhanced result message
      const resultMessage = {
        type: 'roll-result' as const,
        result: enhancedResult,
        gameSessionId: message.gameSessionId
      };

      // Convert ObjectId to string for room name
      const roomId = message.gameSessionId.toString();
      logger.debug('Broadcasting enhanced roll result to room:', roomId);

      // Broadcast the enhanced result to all clients
      socket.to(roomId).emit('roll-result', resultMessage);
      socket.emit('roll-result', resultMessage);

      // Send chat notification of the roll result
      try {
        // Get user info for the chat message
        const user = await UserModel.findById(userId);
        const userName = user?.username || 'Unknown Player';

        // Format dice results for chat display
        const diceResultsText = Object.entries(enhancedResult.diceResults)
          .map(([dieType, results]) => `${dieType} results [${results.join(', ')}]`)
          .join(', ');

        // Create formatted chat message
        const rollChatMessage = `🎲 ${userName} rolled ${enhancedResult.formula}: ${diceResultsText} → Total: ${enhancedResult.total}`;

        // Create chat metadata for system message
        const chatMetadata = {
          sender: {
            type: 'system' as const,
            id: 'system'
          },
          recipient: {
            type: 'session' as const,
            id: message.gameSessionId
          },
          timestamp: new Date().toISOString()
        };

        // Broadcast chat message to the session room
        socket.to(roomId).emit('chat', chatMetadata, rollChatMessage);
        socket.emit('chat', chatMetadata, rollChatMessage);

        logger.debug('Roll chat notification sent:', {
          userName,
          formula: message.formula,
          total: enhancedResult.total,
          roomId
        });
      } catch (chatError) {
        logger.warn('Failed to send roll chat notification:', chatError);
        // Don't fail the entire roll if chat fails
      }

      logger.info('Enhanced roll command processed successfully:', {
        formula: message.formula,
        total: enhancedResult.total,
        diceTypes: Object.keys(enhancedResult.diceResults),
        roomId
      });

      // Send acknowledgment
      callback({ success: true });
    } catch (error) {
      logger.error('Error handling roll command:', error);
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

// Register the socket handler
socketHandlerRegistry.register(rollCommandHandler);

export default rollCommandHandler;
