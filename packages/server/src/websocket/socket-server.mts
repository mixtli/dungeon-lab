import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { handleChatMessage } from './handlers/chat-handler.mjs';
import { handleDiceRoll } from './handlers/dice-handler.mjs';
import { handlePluginAction } from './handlers/plugin-handler.mjs';
import { handleGameStateUpdate } from './handlers/game-state-handler.mjs';
import { handleRollCommand } from './handlers/roll-command.handler.mjs';
import { handleCombatAction } from './handlers/combat-handler.mjs';
import { handleEncounterStart, handleEncounterStop } from './handlers/encounter-handler.mjs';
//import { AuthenticatedSocket } from './types.mjs';
import { logger } from '../utils/logger.mjs';
import { Socket } from 'socket.io';
import { sessionMiddleware } from '../app.mjs';
import { CampaignService, GameSessionModel } from '../features/campaigns/index.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/schemas/socket/index.mjs';

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
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      }
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

  async handleJoinSession(socket: Socket, sessionId: string) {
    console.log('joinSession', sessionId);
    const session = await GameSessionModel.findById(sessionId).exec();
    if (!session) {
      throw new Error('Session not found');
    }
    if (session.participants.includes(socket.userId)) {
      socket.join(sessionId);
    } else {
      const campaignService = new CampaignService();
      if (await campaignService.isUserCampaignMember(socket.userId, session.campaignId)) {
        session.participants.push(socket.userId);
        await session.save();
        socket.join(sessionId);
      } else {
        throw new Error('User not in session');
      }
    }
    socket.gameSessionId = sessionId;
  }

  handleConnections() {
    this.io.on('connection', (socket) => {
      // const socket = rawSocket as AuthenticatedSocket;
      logger.info(`Client connected: ${socket.id} (${socket.userId})`);

      socket.on('chat', (foo) => {
        console.log('foo', foo);
      });

      // socket.on('message', (message) => console.log('message', message));
      socket.on('joinSession', (sessionId: string) => this.handleJoinSession(socket, sessionId));
      // socket.on('dice:roll', (message) => handleDiceRoll(socket, message));
      // socket.on('plugin:action', (message) => handlePluginAction(socket, message));
      // socket.on('game:stateUpdate', (message) => handleGameStateUpdate(socket, message));
      // socket.on('roll:command', () => handleRollCommand(socket));
      // socket.on('combat:action', (message) => handleCombatAction(io, socket, message));
      // socket.on('encounter:start', (message) => handleEncounterStart(io, socket, message));
      // socket.on('encounter:stop', (message) => handleEncounterStop(io, socket, message));

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id} (${socket.userId})`);
      });
    });
  }
}
