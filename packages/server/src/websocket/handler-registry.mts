import { Socket } from 'socket.io';
import { logger } from '../utils/logger.mjs';
import type {
  ServerToClientEvents,
  ClientToServerEvents
} from '@dungeon-lab/shared/types/socket/index.mjs';

type SocketHandler = (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => void;

class SocketHandlerRegistry {
  private handlers: SocketHandler[] = [];

  register(handler: SocketHandler): void {
    this.handlers.push(handler);
    logger.debug(`Socket handler registered, total handlers: ${this.handlers.length}`);
  }

  applyAll(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
    this.handlers.forEach((handler) => handler(socket));
  }
}

// Singleton instance
export const socketHandlerRegistry = new SocketHandlerRegistry();
