/**
 * Core Action Handler Registration
 * 
 * Registers all core VTT action handlers during app initialization.
 */

import { registerAction } from './multi-handler-registry.js';
import { moveTokenActionHandler } from './handlers/actions/move-token.handler.js';
import { addTokenActionHandler } from './handlers/actions/add-token.handler.js';
import { addDocumentActionHandler } from './handlers/actions/add-document.handler.js';
import { removeDocumentActionHandler } from './handlers/actions/remove-document.handler.js';
import { removeTokenActionHandler } from './handlers/actions/remove-token.handler.js';
import { updateDocumentActionHandler } from './handlers/actions/update-document.handler.js';
import { assignItemActionHandler } from './handlers/actions/assign-item.handler.js';
import { endTurnActionHandler } from './handlers/actions/end-turn.handler.js';
import { rollInitiativeActionHandler } from './handlers/actions/roll-initiative.handler.js';
import { startEncounterActionHandler } from './handlers/actions/start-encounter.handler.js';
import { stopEncounterActionHandler } from './handlers/actions/stop-encounter.handler.js';

/**
 * Initialize all core action handlers
 * 
 * This function should be called during app startup, before any game sessions start.
 */
export function initializeCoreActionHandlers(): void {
  console.log('[CoreActionHandlers] Initializing core action handlers...');

  // Register core move-token handler
  registerAction('move-token', moveTokenActionHandler);

  // Register core add-token handler
  registerAction('add-token', addTokenActionHandler);

  // Register core add-document handler
  registerAction('add-document', addDocumentActionHandler);

  // Register core remove-document handler
  registerAction('remove-document', removeDocumentActionHandler);

  // Register core remove-token handler
  registerAction('remove-token', removeTokenActionHandler);

  // Register core update-document handler
  registerAction('update-document', updateDocumentActionHandler);

  // Register core assign-item handler  
  registerAction('assign-item', assignItemActionHandler);

  // Register core encounter and turn management handlers
  registerAction('end-turn', endTurnActionHandler);
  registerAction('roll-initiative', rollInitiativeActionHandler);
  registerAction('start-encounter', startEncounterActionHandler);
  registerAction('stop-encounter', stopEncounterActionHandler);

  console.log('[CoreActionHandlers] Core action handlers initialized');
}