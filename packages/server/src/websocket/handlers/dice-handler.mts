import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import { logger } from '../../utils/logger.mjs';
import { rollDice } from '../utils/dice.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

/**
 * Socket handler for dice rolls
 * @param socket The client socket connection
 */
function diceHandler(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  socket.on('diceRoll', async (message) => {
    try {
      // Validate the message
      if (!message.formula) {
        socket.emit('error', 'No dice formula provided');
        return;
      }

      // Log the dice roll
      logger.info(`Dice roll received: ${JSON.stringify(message)}`);

      // Roll the dice and get results
      const diceResult = await rollDice(message.formula);

      // Format result to match schema
      const result = {
        formula: diceResult.formula,
        rolls: diceResult.rolls.map((r) => ({ die: 0, result: r })),
        total: diceResult.total,
        userId: socket.userId
      };

      // Broadcast the roll result to all players in the session
      if (message.gameSessionId && socket.gameSessionId) {
        socket.to(socket.gameSessionId).emit('diceRoll', {
          ...message,
          result,
          userId: socket.userId
        });
      }

      // Also send back to the sender
      socket.emit('diceRoll', {
        ...message,
        result,
        userId: socket.userId
      });
    } catch (error) {
      logger.error('Error handling dice roll:', error);
      socket.emit('error', 'Failed to process dice roll');
    }
  });
}

// Register the socket handler
socketHandlerRegistry.register(diceHandler);

export default diceHandler;
