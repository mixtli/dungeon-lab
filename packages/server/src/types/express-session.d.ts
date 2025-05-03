import 'express-session';
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
