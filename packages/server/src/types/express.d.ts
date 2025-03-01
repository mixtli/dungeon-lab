// Type definitions for Express
// Extends the Express namespace to include our custom User properties

declare namespace Express {
  interface User {
    id: string;
    username: string;
    isAdmin: boolean;
  }
} 