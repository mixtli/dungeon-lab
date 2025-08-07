import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { instrument } from '@socket.io/admin-ui';
import { sessionMiddleware } from '../app.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';
import { logger } from '../utils/logger.mjs';
import { socketHandlerRegistry } from './handler-registry.mjs';
import { GameSessionService } from '../features/campaigns/services/game-session.service.mjs';

// Define a type for the session with user information
interface SessionWithUser {
  user?: {
    id: string;
    isAdmin?: boolean;
  };
}

export class SocketServer {
  private static instance: SocketServer | null = null;
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(httpServer: HttpServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: {
        origin: [
          process.env.CLIENT_URL || 'http://localhost:5173',
          'http://localhost:3001',
          'https://admin.socket.io'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    instrument(this.io, {
      auth: false,
      mode: 'development'
    });

    this.io.on('error', (error) => {
      console.error('Socket.IO server error:', error);
    });
    this.io.engine.use(sessionMiddleware);
    this.setupAuthMiddleware();
    this.handleConnections();

    // Store as singleton instance
    SocketServer.instance = this;
  }

  close() {
    this.io.close();
  }

  private setupAuthMiddleware() {
    this.io.use((socket: Socket, next) => {
      // Now socket.request.session is available
      const request = socket.request as { session?: SessionWithUser };
      const session = request.session;

      if (session?.user?.id) {
        socket.userId = session.user.id;
        socket.isAdmin = session.user.isAdmin || false;
        logger.debug(`Socket authenticated for user: ${session.user.id} (admin: ${socket.isAdmin})`);
        next();
      } else {
        logger.debug('Socket authentication failed: No user in session');
        next(new Error('Authentication required'));
      }
    });
  }

  // Legacy handleJoinSession and handleLeaveSession methods removed
  // Session management now handled by gameSession:join/gameSession:leave events in game-state-handler

  handleConnections() {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      // const socket = rawSocket as AuthenticatedSocket;
      logger.info(`Client connected: ${socket.id} (${socket.userId})`);

      // Join your own "Room" so others can message you directly with your userId
      socket.join("user:" + socket.userId);

      // Apply all registered handlers
      socketHandlerRegistry.applyAll(socket);

      socket.onAny((eventName, ...args) => {
        logger.info('Socket event:', { eventName, args: JSON.stringify(args, null, 2) });
      });
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        // TODO: Implement retry logic or user notification
      });
      // Legacy joinSession/leaveSession handlers removed - now using gameSession:join/gameSession:leave in game-state-handler

      socket.on('disconnect', async () => {
        logger.info(`Client disconnected: ${socket.id} (${socket.userId})`);
        
        // Clean up participant data for any sessions user was in
        if (socket.gameSessionId) {
          try {
            const gameSessionService = new GameSessionService();
            await gameSessionService.removeParticipantFromSession(socket.gameSessionId, socket.userId);
            logger.info(`Cleaned up participant for disconnected user: ${socket.userId} from session: ${socket.gameSessionId}`);
          } catch (error) {
            logger.error('Error cleaning up participant on disconnect:', error);
          }
        }
        
        // Socket.IO automatically handles leaving rooms on disconnect
      });
    });
  }

  // Add getter for io instance
  get socketIo() {
    return this.io;
  }
  
  // Static method to get the instance
  static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      throw new Error('SocketServer has not been initialized yet');
    }
    return SocketServer.instance;
  }
}

// Helper function to get the socket server instance
export function getSocketServer(): SocketServer {
  return SocketServer.getInstance();
}
