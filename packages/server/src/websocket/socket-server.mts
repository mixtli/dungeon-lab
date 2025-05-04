import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { instrument } from '@socket.io/admin-ui';
import { sessionMiddleware } from '../app.mjs';
import { GameSessionModel } from '../features/campaigns/models/game-session.model.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  JoinCallback
} from '@dungeon-lab/shared/types/socket/index.mjs';
import { logger } from '../utils/logger.mjs';
import { socketHandlerRegistry } from './handler-registry.mjs';
import { CampaignService } from '../features/campaigns/index.mjs';




// Define a type for the session with user information
interface SessionWithUser {
  user?: {
    id: string;
  };
}

export class SocketServer {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(httpServer: HttpServer) {
    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
      cors: {
        origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:3001'],
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
        logger.debug(`Socket authenticated for user: ${session.user.id}`);
        next();
      } else {
        logger.debug('Socket authentication failed: No user in session');
        next(new Error('Authentication required'));
      }
    });
  }

  async handleJoinSession(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    sessionId: string,
    actorId?: string,
    callback?: (response: JoinCallback) => void
  ) {
    console.log('joinSession', sessionId);
    try {
      const session = await GameSessionModel.findById(sessionId)
        .populate('campaign')
        .populate('gameMaster')
        .populate('characters');
      if (!session) {
        throw new Error('Session not found');
      }

      // Leave any existing game session room
      if (socket.gameSessionId) {
        socket.leave(`session:${socket.gameSessionId}`);
      }

      // socket.join(`user:${socket.userId}`);

      const campaignService = new CampaignService();

      if (!session.participantIds.includes(socket.userId)) {
        session.participantIds.push(socket.userId);
      }

      // If actorId is provided, join an actor-specific room
      if (actorId) {
        logger.info(`Joining actor room: actor:${actorId}`);
        if (await campaignService.isActorCampaignMember(actorId, session.campaignId)) {
          session.characterIds.push(actorId);
          await session.save();
          socket.join(`actor:${actorId}`);
        } else {
          throw new Error('User not in session');
        }
      }
      // Join the new game session room
      socket.join(`session:${sessionId}`);
      socket.gameSessionId = sessionId;

      // Notify other users in the session
      socket.to(`session:${sessionId}`).emit('userJoinedSession', {
        userId: socket.userId,
        sessionId,
        actorId
      });

      // Send campaign data to the user via the callback
      if (callback) {
        callback({
          success: true,
          data: session.toObject()
        });
      }
    } catch (error) {
      logger.error('Error joining session:', error);
      if (callback) {
        callback({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  handleLeaveSession(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    sessionId: string
  ) {
    console.log('leaveSession', sessionId);
    socket.leave(sessionId);
    socket.gameSessionId = undefined;
  }

  handleConnections() {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      // const socket = rawSocket as AuthenticatedSocket;
      logger.info(`Client connected: ${socket.id} (${socket.userId})`);

      // Join your own "Room" so others can message you directly with your userId
      socket.join("user:" + socket.userId);

      // Apply all registered handlers
      socketHandlerRegistry.applyAll(socket);

      socket.onAny((eventName, ...args) => {
        logger.info('Socket event:', { eventName, args });
      });
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        // TODO: Implement retry logic or user notification
      });
      socket.on(
        'joinSession',
        (
          sessionId: string,
          actorId: string | undefined,
          callback: (response: JoinCallback) => void
        ) => this.handleJoinSession(socket, sessionId, actorId, callback)
      );
      socket.on('leaveSession', (sessionId: string) => this.handleLeaveSession(socket, sessionId));

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id} (${socket.userId})`);
      });
    });
  }
}
