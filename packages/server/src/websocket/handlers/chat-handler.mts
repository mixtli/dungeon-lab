import type { IChatMessage, IMessage } from '@dungeon-lab/shared/index.mjs';
import { CampaignModel } from '../../features/campaigns/models/campaign.model.mjs';
import { GameSessionModel } from '../../features/campaigns/models/game-session.model.mjs';
import { Socket } from 'socket.io';

// Type guard to check if a message is a chat message
function isChatMessage(message: IMessage): message is IChatMessage {
  return message.type === 'chat';
}

export async function handleChatMessage(socket: Socket, message: IMessage): Promise<void> {
  console.log('handleChatMessage', message);
  console.log('sessionId', socket.gameSessionId);
  try {
    if (!socket.gameSessionId) {
      socket.emit('error', { message: 'Not in a game session' });
      return;
    }

    // Verify socket is a chat message
    if (!isChatMessage(message)) {
      socket.emit('error', { message: 'Invalid message type' });
      return;
    }

    // Validate sender matches socket user
    if (message.sender.toString() !== socket.userId) {
      socket.emit('error', { message: 'Invalid message sender' });
      return;
    }

    // Get the game session to find the campaign and game master
    const gameSession = await GameSessionModel.findById(message.gameSessionId).exec();
    if (!gameSession) {
      socket.emit('error', { message: 'Game session not found' });
      return;
    }

    // Get the campaign to find the player's character
    const campaign = await CampaignModel.findById(gameSession.campaignId).exec();
    if (!campaign) {
      socket.emit('error', { message: 'Campaign not found' });
      return;
    }

    // Prepare variables that might be used in switch cases
    let sockets;
    let gmsocket;
    let targetsockets;
    let targetsocket;

    // Handle different recipient types
    switch (message.recipient) {
      case 'all':
        // Broadcast to all users in the session
        socket.to(socket.gameSessionId).emit('message', message);
        break;

      case 'gm':
        // Find GM socket and send message
        if (!campaign.gameMasterId) {
          socket.emit('error', { message: 'Game master not found' });
          return;
        }
        sockets = await socket.in(socket.gameSessionId).fetchSockets();
        gmsocket = sockets.find((s) => {
          return campaign.gameMasterId && s.data.userId === campaign.gameMasterId.toString();
        });
        if (gmsocket) {
          gmsocket.emit('message', message);
        }
        break;

      case 'server':
        // Message only for server processing, no forwarding needed
        break;

      default:
        // Direct message to specific user
        targetsockets = await socket.in(socket.gameSessionId).fetchSockets();
        targetsocket = targetsockets.find((s) => {
          return s.data.userId === message.recipient;
        });
        if (targetsocket) {
          targetsocket.emit('message', message);
          // Also send to sender if they're not the target
          if (message.sender.toString() !== message.recipient.toString()) {
            socket.emit('message', message);
          }
        }
    }
  } catch (error) {
    console.error('Error handling chat message:', error);
    socket.emit('error', { message: 'Failed to process chat message' });
  }
}
