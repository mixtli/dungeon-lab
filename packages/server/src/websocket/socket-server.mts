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
import { GameSessionService } from '../features/campaigns/services/game-session.service.mjs';

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
    console.log('joinSession', sessionId, actorId);
    try {
      // Use GameSessionService to fetch and populate the session
      const gameSessionService = new GameSessionService();
      const session = await gameSessionService.getGameSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Leave any existing game session room
      if (socket.gameSessionId) {
        socket.leave(`session:${socket.gameSessionId}`);
      }

      // Add user to session participants
      await gameSessionService.addParticipantToSession(sessionId, socket.userId);

      // If actorId is provided, join an actor-specific room and add actor to session
      if (actorId) {
        logger.info(`Joining actor room: actor:${actorId}`);
        const campaignService = new CampaignService();
        if (await campaignService.isActorCampaignMember(actorId, session.campaignId)) {
          console.log('actor is in campaign', actorId, session.campaignId);
          
          // Add actor to session using the new service method
          await gameSessionService.addActorToSession(sessionId, actorId);
          
          socket.join(`actor:${actorId}`);
          console.log('joined actor room', actorId);
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

      // Fetch the most up-to-date session with populated data
      const updatedSession = await GameSessionModel.findById(sessionId)
        .populate('campaign')
        .populate('gameMaster')
        .populate('characters');

      // Send campaign data to the user via the callback
      if (callback) {
        callback({
          success: true,
          data: updatedSession?.toObject()
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

  async handleLeaveSession(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    sessionId: string
  ) {
    console.log('leaveSession', sessionId);
    try {
      // Get the session with populated characters
      const session = await GameSessionModel.findById(sessionId)
        .populate('characters');
      if (!session) {
        logger.warn(`Session not found when leaving: ${sessionId}`);
        socket.leave(`session:${sessionId}`);
        socket.gameSessionId = undefined;
        return;
      }

      // Get userId from socket
      const userId = socket.userId;
      
      // Find all characters owned by this user in the session
      const userActorIds: string[] = [];
      const characterNames: string[] = [];
      
      if (session.characters && Array.isArray(session.characters)) {
        // Filter characters that belong to this user
        for (const character of session.characters) {
          if (character.createdBy === userId && character.id) {
            userActorIds.push(character.id);
            characterNames.push(character.name);
            
            // Leave the actor-specific room
            socket.leave(`actor:${character.id}`);
          }
        }
      }
      
      // Use the new service methods to remove participants and actors
      const gameSessionService = new GameSessionService();
      
      // Remove the user from participants
      await gameSessionService.removeParticipantFromSession(sessionId, userId);
      
      // Remove each of the user's characters from the session
      for (const actorId of userActorIds) {
        await gameSessionService.removeActorFromSession(sessionId, actorId);
      }
      
      // Notify other users in the session
      socket.to(`session:${sessionId}`).emit('userLeftSession', {
        userId,
        sessionId,
        actorIds: userActorIds,
        characterNames
      });
      
      // Leave the session room
      socket.leave(`session:${sessionId}`);
      socket.gameSessionId = undefined;
      
      logger.info(`User ${userId} left session ${sessionId} with characters: ${characterNames.join(', ')}`);
    } catch (error) {
      logger.error('Error handling leave session:', error);
      // Still leave the session room even if there was an error
      socket.leave(`session:${sessionId}`);
      socket.gameSessionId = undefined;
    }
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
        logger.info('Socket event:', { eventName, args: JSON.stringify(args, null, 2) });
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

      socket.on('disconnect', async () => {
        logger.info(`Client disconnected: ${socket.id} (${socket.userId})`);
        
        // If user was in a session, handle leaving that session
        if (socket.gameSessionId) {
          try {
            await this.handleLeaveSession(socket, socket.gameSessionId);
          } catch (error) {
            logger.error('Error handling disconnect from session:', error);
          }
        }
      });
    });
  }
}
