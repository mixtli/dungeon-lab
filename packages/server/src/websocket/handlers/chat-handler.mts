import { Server } from 'socket.io';
import { IChatMessage } from '@dungeon-lab/shared/index.mjs';
import { AuthenticatedSocket, RemoteAuthenticatedSocket } from '../types.mjs';
import { GameSessionModel } from '../../models/game-session.model.mjs';
import { CampaignModel } from '../../models/campaign.model.mjs';
import { ActorModel } from '../../models/actor.model.mjs';
import { Types } from 'mongoose';

export async function handleChatMessage(
  io: Server,
  socket: AuthenticatedSocket,
  message: IChatMessage
): Promise<void> {
  try {
    if (!socket.sessionId) {
      socket.emit('error', { message: 'Not in a game session' });
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

    // Handle different recipient types
    switch (message.recipient) {
      case 'all':
        // Broadcast to all users in the session
        io.to(socket.sessionId).emit('message', message);
        break;

      case 'gm':
        // Find GM socket and send message
        const sockets = await io.in(socket.sessionId).fetchSockets();
        const gmSocket = sockets.find(s => {
          const authSocket = s as unknown as RemoteAuthenticatedSocket;
          return authSocket.data.userId === message.recipient;
        });
        if (gmSocket) {
          (gmSocket as unknown as RemoteAuthenticatedSocket).emit('message', message);
        }
        break;

      case 'server':
        // Message only for server processing, no forwarding needed
        break;

      default:
        // Direct message to specific user
        const targetSockets = await io.in(socket.sessionId).fetchSockets();
        const targetSocket = targetSockets.find(s => {
          const authSocket = s as unknown as RemoteAuthenticatedSocket;
          return authSocket.data.userId === message.recipient;
        });
        if (targetSocket) {
          (targetSocket as unknown as RemoteAuthenticatedSocket).emit('message', message);
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