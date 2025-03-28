import { IRollCommandMessage, IRollResultMessage } from '@dungeon-lab/shared/index.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { DiceService } from '../../services/dice.service.mjs';
import { logger } from '../../utils/logger.mjs';
import { AuthenticatedSocket } from '../types.mjs';

const diceService = new DiceService();

type RollCommandCallback = (response: { 
  success: boolean; 
  error?: string;
}) => void;

export function handleRollCommand(socket: AuthenticatedSocket) {
  logger.info('Registering roll command handler for socket:', {
    socketId: socket.id,
    userId: socket.userId
  });

  socket.on('roll-command', async (message: IRollCommandMessage, callback: RollCommandCallback) => {
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

      if (!gameSession.participants.includes(userId)) {
        logger.warn('Roll command rejected: User not in session', {
          userId,
          sessionId: message.gameSessionId
        });
        throw new Error('Not authorized for this game session');
      }

      // Roll the dice
      logger.debug('Rolling dice with formula:', message.formula);
      const rollResult = diceService.rollDice(message.formula, userId);
      logger.debug('Roll result:', rollResult);

      // Create the result message
      const resultMessage: IRollResultMessage = {
        type: 'roll-result',
        result: rollResult,
        gameSessionId: message.gameSessionId
      };

      // Convert ObjectId to string for room name
      const roomId = message.gameSessionId.toString();
      logger.debug('Broadcasting roll result to room:', roomId);

      // Log room membership
      const rooms = Array.from(socket.rooms);
      logger.debug('Socket rooms:', {
        socketId: socket.id,
        rooms,
        targetRoom: roomId
      });

      // Broadcast the result to all clients in the game session
      socket.to(roomId).emit('roll-result', resultMessage);
      // Also send to the sender
      socket.emit('roll-result', resultMessage);

      logger.info('Roll command processed successfully:', {
        formula: message.formula,
        total: rollResult.total,
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