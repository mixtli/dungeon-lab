import { Socket } from 'socket.io';
import { Request } from 'express';

// Extend express-session with our user data
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      email?: string;
      isAdmin: boolean;
    };
  }
}

// Define the shape of our socket data
export interface SocketData {
  userId: string;
  sessionId?: string;
}

// Socket type for connected clients
export interface AuthenticatedSocket extends Socket {
  userId: string;
  sessionId?: string;
  request: Request;
}

// Socket type for remote clients (other users in the session)
export interface RemoteAuthenticatedSocket {
  id: string;
  userId: string;
  sessionId?: string;
  emit: (ev: string, ...args: any[]) => boolean;
  join: (room: string) => Promise<void>;
  leave: (room: string) => Promise<void>;
  to: (room: string) => { emit: RemoteAuthenticatedSocket['emit'] };
  handshake: { auth: { token?: string } };
  data: SocketData;
} 