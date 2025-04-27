import { IDiceRollMessage } from '@dungeon-lab/shared/index.mjs';
import { Server, Socket } from 'socket.io';
import { rollDice } from '../utils/dice.mjs';
import { logger } from '../../utils/logger.mjs';

export async function handleDiceRoll(
  io: Server,
  socket: Socket,
  message: IDiceRollMessage
): Promise<void> {
  try {
    // Validate the message
    if (!message.data?.formula) {
      socket.emit('error', { message: 'No dice formula provided' });
      return;
    }

    // Log the dice roll
    logger.info(`Dice roll received: ${JSON.stringify(message)}`);

    // Roll the dice and get results
    const result = rollDice(message.data.formula);

    // Broadcast the roll result to all players in the session
    if (message.gameSessionId) {
      io.to(message.gameSessionId.toString()).emit('diceRoll', {
        ...message,
        data: {
          ...message.data,
          result
        },
        userId: socket.data.userId,
        username: socket.data.username
      });
    } else {
      socket.emit('diceRoll', {
        ...message,
        data: {
          ...message.data,
          result
        },
        userId: socket.data.userId,
        username: socket.data.username
      });
    }
  } catch (error) {
    logger.error('Error handling dice roll:', error);
    socket.emit('error', { message: 'Failed to process dice roll' });
  }
}
