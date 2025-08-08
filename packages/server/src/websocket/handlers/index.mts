// This file imports all socket handlers so they can register themselves
// with the socketHandlerRegistry

// Import handlers (the order doesn't matter as they register themselves)
import './dice-handler.mjs';
import './roll-command.handler.mjs';
import './game-state-handler.mjs';
import './game-action-handler.mjs';
import '../../features/maps/event-handlers/map-generator-handler.mjs';

// Export empty object to satisfy ESM requirements
export {};
