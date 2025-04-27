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

declare module 'socket.io' {
  interface Socket {
    userId: string;
    gameSessionId?: string;
  }
}
