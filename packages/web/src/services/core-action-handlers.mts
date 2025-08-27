/**
 * Core Action Handler Registration
 * 
 * Registers all core VTT action handlers during app initialization.
 */

import { registerAction } from './multi-handler-registry.mjs';
import { moveTokenActionHandler } from './handlers/actions/move-token.handler.mjs';
import { addDocumentActionHandler } from './handlers/actions/add-document.handler.mjs';
import { removeDocumentActionHandler } from './handlers/actions/remove-document.handler.mjs';
import { removeTokenActionHandler } from './handlers/actions/remove-token.handler.mjs';
import { updateDocumentActionHandler } from './handlers/actions/update-document.handler.mjs';
import { assignItemActionHandler } from './handlers/actions/assign-item.handler.mjs';
import { endTurnActionHandler } from './handlers/actions/end-turn.handler.mjs';
import { rollInitiativeActionHandler } from './handlers/actions/roll-initiative.handler.mjs';
import { startEncounterActionHandler } from './handlers/actions/start-encounter.handler.mjs';
import { stopEncounterActionHandler } from './handlers/actions/stop-encounter.handler.mjs';

/**
 * Initialize all core action handlers
 * 
 * This function should be called during app startup, before any game sessions start.
 */
export function initializeCoreActionHandlers(): void {
  console.log('[CoreActionHandlers] Initializing core action handlers...');

  // Register core move-token handler
  registerAction('move-token', moveTokenActionHandler);

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