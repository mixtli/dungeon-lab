// This file imports all socket handlers so they can register themselves
// with the socketHandlerRegistry

// Import handlers (the order doesn't matter as they register themselves)
import './dice-handler.mjs';
import './move-handler.mjs';
import './roll-command.handler.mjs';
import './actor-handler.mjs';
import './item-handler.mjs';
import '../../features/encounters/websocket/encounter-handler.mjs';
import '../../features/maps/event-handlers/map-generator-handler.mjs';

// Export empty object to satisfy ESM requirements
export {};
