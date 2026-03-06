// This file imports all socket handlers so they can register themselves
// with the socketHandlerRegistry

// Import handlers (the order doesn't matter as they register themselves)
import './game-state-handler.js';
import './game-action-handler.js';
import './roll-handler.js';
import '../../features/maps/event-handlers/map-generator-handler.js';
import '../../features/documents/socket-handlers/document-socket.handler.js';

// Export empty object to satisfy ESM requirements
export {};
