import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { IMessage } from '@dungeon-lab/shared/index.mjs';
import { Request, Response, NextFunction } from 'express';
import { handleChatMessage } from './handlers/chat-handler.mjs';
import { handleDiceRoll } from './handlers/dice-handler.mjs';
import { handlePluginAction } from './handlers/plugin-handler.mjs';
import { handleGameStateUpdate } from './handlers/game-state-handler.mjs';
import { handleEncounterStart } from './handlers/encounter-handler.mjs';
import { GameSessionModel } from '../features/campaigns/models/game-session.model.mjs';
import { PluginManager } from '../services/plugin-manager.mjs';
import { AuthenticatedSocket } from './types.mjs';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { config } from '../config/index.mjs';

// Create session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.mongoUri,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 1 day in seconds
    autoRemove: 'native',
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
});

export function createSocketServer(httpServer: HttpServer, pluginManager: PluginManager): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Use session middleware for Socket.IO
  io.engine.use((req: Request, res: Response, next: NextFunction) => {
    sessionMiddleware(req, res, next);
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const req = socket.request as Request;
      if (!req.session?.user) {
        return next(new Error('Authentication required'));
      }

      // Add user info to socket
      (socket as AuthenticatedSocket).userId = req.session.user.id;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    console.log(`User ${socket.userId} connected`);

    // Join game session
    socket.on('join-session', async (sessionId: string) => {
      try {
        const session = await GameSessionModel.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Game session not found' });
          return;
        }

        if (!session.participants.includes(socket.userId)) {
          socket.emit('error', { message: 'Not authorized to join this session' });
          return;
        }

        socket.sessionId = sessionId;
        await socket.join(sessionId);
        
        // Notify others in the session
        socket.to(sessionId).emit('user-joined', {
          userId: socket.userId,
          timestamp: new Date(),
        });

        // Send initial game state
        // TODO: Implement game state retrieval and sending
      } catch (error) {
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Leave game session
    socket.on('leave-session', async () => {
      if (socket.sessionId) {
        await socket.leave(socket.sessionId);
        socket.to(socket.sessionId).emit('user-left', {
          userId: socket.userId,
          timestamp: new Date(),
        });
        socket.sessionId = undefined;
      }
    });

    // Message handler
    socket.on('message', async (message: IMessage) => {
      try {
        if (!socket.sessionId) {
          socket.emit('error', { message: 'Not in a game session' });
          return;
        }

        // Validate that the message is for the current session
        if (message.gameSessionId.toString() !== socket.sessionId) {
          socket.emit('error', { message: 'Invalid session ID in message' });
          return;
        }

        // Route message to appropriate handler based on type
        switch (message.type) {
          case 'chat':
            await handleChatMessage(io, socket, message);
            break;
          case 'roll-dice':
            await handleDiceRoll(io, socket, message);
            break;
          case 'plugin-action':
            await handlePluginAction(io, socket, message, pluginManager);
            break;
          case 'game-state-update':
            await handleGameStateUpdate(io, socket, message);
            break;
          case 'plugin-state-update':
            // Plugin state updates should only come from the server/plugins
            socket.emit('error', { message: 'Unauthorized plugin state update' });
            break;
          default:
            socket.emit('error', { message: 'Unknown message type' });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Encounter start handler
    socket.on('encounter:start', async (message: { sessionId: string; encounterId: string }) => {
      await handleEncounterStart(io, socket, message);
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      if (socket.sessionId) {
        socket.to(socket.sessionId).emit('user-left', {
          userId: socket.userId,
          timestamp: new Date(),
        });
      }
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
} 