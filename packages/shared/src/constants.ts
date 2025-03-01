/**
 * API Routes
 */
export const API_ROUTES = {
  ACTORS: '/api/actors',
  ITEMS: '/api/items',
  GAME_SYSTEMS: '/api/game-systems',
  PLUGINS: '/api/plugins',
  AUTH: '/api/auth',
};

/**
 * Error Codes
 */
export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

/**
 * Socket.io Events
 */
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ACTOR_CREATED: 'actor:created',
  ACTOR_UPDATED: 'actor:updated',
  ACTOR_DELETED: 'actor:deleted',
  ITEM_CREATED: 'item:created',
  ITEM_UPDATED: 'item:updated',
  ITEM_DELETED: 'item:deleted',
}; 