"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = exports.ERROR_CODES = exports.API_ROUTES = void 0;
/**
 * API Routes
 */
exports.API_ROUTES = {
    ACTORS: '/api/actors',
    ITEMS: '/api/items',
    GAME_SYSTEMS: '/api/game-systems',
    PLUGINS: '/api/plugins',
    AUTH: '/api/auth',
};
/**
 * Error Codes
 */
exports.ERROR_CODES = {
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
exports.SOCKET_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ACTOR_CREATED: 'actor:created',
    ACTOR_UPDATED: 'actor:updated',
    ACTOR_DELETED: 'actor:deleted',
    ITEM_CREATED: 'item:created',
    ITEM_UPDATED: 'item:updated',
    ITEM_DELETED: 'item:deleted',
};
//# sourceMappingURL=constants.js.map