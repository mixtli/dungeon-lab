import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { handleChatMessage } from './handlers/chat-handler.mjs';
import { handleDiceRoll } from './handlers/dice-handler.mjs';
import { handlePluginAction } from './handlers/plugin-handler.mjs';
import { handleGameStateUpdate } from './handlers/game-state-handler.mjs';
import { handleRollCommand } from './handlers/roll-command.handler.mjs';
import { handleCombatAction } from './handlers/combat-handler.mjs';
import { handleEncounterStart, handleEncounterStop } from './handlers/encounter-handler.mjs';
import { AuthenticatedSocket } from './types.mjs';
import { logger } from '../utils/logger.mjs';
import { Socket } from 'socket.io';

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware to handle authentication
  io.use((socket: Socket, next) => {
    const session = (socket.request as any).session;
    if (session?.user?.id) {
      (socket as AuthenticatedSocket).userId = session.user.id;
      next();
    } else {
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    logger.info(`Client connected: ${socket.id} (${socket.userId})`);

    socket.on('chat:message', (message) => handleChatMessage(io, socket, message));
    socket.on('dice:roll', (message) => handleDiceRoll(io, socket, message));
    socket.on('plugin:action', (message) => handlePluginAction(io, socket, message));
    socket.on('game:stateUpdate', (message) => handleGameStateUpdate(io, socket, message));
    socket.on('roll:command', (message) => handleRollCommand(socket));
    socket.on('combat:action', (message) => handleCombatAction(io, socket, message));
    socket.on('encounter:start', (message) => handleEncounterStart(io, socket, message));
    socket.on('encounter:stop', (message) => handleEncounterStop(io, socket, message));

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id} (${socket.userId})`);
    });
  });

  return io;
} 