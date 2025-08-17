/**
 * Action Configuration Registry
 * 
 * Defines approval behavior and handling logic for each game action type.
 * This makes the approval system reusable and configurable for future actions.
 */

import type { GameActionRequest, UpdateDocumentParameters } from '@dungeon-lab/shared/types/game-actions.mjs';

// Import all action handlers
import { updateDocumentHandler } from './handlers/actions/update-document.handler.mts';
import type { ActionHandlerResult } from './handlers/action-handler.types.mts';
import { moveTokenHandler } from './handlers/actions/move-token.handler.mts';
import { removeTokenHandler } from './handlers/actions/remove-token.handler.mts';
import { addDocumentHandler } from './handlers/actions/add-document.handler.mts';
import { endTurnHandler } from './handlers/actions/end-turn.handler.mts';
import { rollInitiativeHandler } from './handlers/actions/roll-initiative.handler.mts';
import { startEncounterHandler } from './handlers/actions/start-encounter.handler.mts';
import { stopEncounterHandler } from './handlers/actions/stop-encounter.handler.mts';

export interface ActionConfig {
  requiresApproval: boolean;
  gmOnly?: boolean;
  autoApprove?: boolean;
  approvalMessage?: (request: GameActionRequest) => string;
  handler: (request: GameActionRequest) => Promise<ActionHandlerResult>;
}

export type { ActionHandlerResult };

/**
 * Registry of action configurations
 * Add new action types here to configure their approval behavior
 */
export const actionConfigs: Record<string, ActionConfig> = {
  // Token movement actions - currently auto-approve after validation
  'move-token': {
    autoApprove: true,
    requiresApproval: false,
    handler: moveTokenHandler,
    approvalMessage: (request) => {
      const params = request.parameters as { tokenId: string; newPosition: { x: number; y: number } };
      return `wants to move token to position (${params.newPosition.x}, ${params.newPosition.y})`;
    }
  },

  // Token removal actions - currently auto-approve for GM, deny for players
  'remove-token': {
    autoApprove: true,
    requiresApproval: false,
    handler: removeTokenHandler,
    approvalMessage: (request) => {
      const params = request.parameters as { tokenName: string };
      return `wants to remove token "${params.tokenName}"`;
    }
  },

  // Document addition actions - currently auto-approve
  'add-document': {
    autoApprove: true,
    requiresApproval: false,
    handler: addDocumentHandler,
    approvalMessage: (request) => {
      const params = request.parameters as { documentData?: { name?: string; documentType?: string } };
      const docName = params.documentData?.name || 'Unknown';
      const docType = params.documentData?.documentType || 'document';
      return `wants to add ${docType} "${docName}" to the game`;
    }
  },

  // Document update actions - REQUIRES GM APPROVAL
  'update-document': {
    requiresApproval: true,
    autoApprove: false,
    handler: updateDocumentHandler,
    approvalMessage: (request) => {
      const params = request.parameters as UpdateDocumentParameters;
      const docName = params.documentName || 'Unknown Document';
      const docType = params.documentType || 'document';
      return `wants to modify ${docType} "${docName}"`;
    }
  },

  // Turn management actions - currently auto-approve with validation
  'end-turn': {
    autoApprove: true,
    requiresApproval: false,
    handler: endTurnHandler,
    approvalMessage: () => 'wants to end their turn'
  },

  'roll-initiative': {
    autoApprove: true,
    requiresApproval: false,
    handler: rollInitiativeHandler,
    approvalMessage: () => 'wants to reroll initiative'
  },

  // Encounter management actions - currently GM-only
  'start-encounter': {
    gmOnly: true,
    autoApprove: true,
    requiresApproval: false,
    handler: startEncounterHandler,
    approvalMessage: (request) => {
      const params = request.parameters as { encounterId: string };
      return `wants to start encounter ${params.encounterId}`;
    }
  },

  'stop-encounter': {
    gmOnly: true,
    autoApprove: true,
    requiresApproval: false,
    handler: stopEncounterHandler,
    approvalMessage: (request) => {
      const params = request.parameters as { encounterId: string };
      return `wants to stop encounter ${params.encounterId}`;
    }
  }
};

/**
 * Get action configuration for a given action type
 * Returns default config if action type is not registered
 */
export function getActionConfig(actionType: string): ActionConfig {
  return actionConfigs[actionType] || {
    requiresApproval: false,
    autoApprove: false,
    approvalMessage: () => `wants to perform action: ${actionType}`
  };
}

/**
 * Check if an action requires GM approval
 */
export function requiresApproval(actionType: string): boolean {
  const config = getActionConfig(actionType);
  return config.requiresApproval === true;
}

/**
 * Check if an action should be auto-approved (without manual GM intervention)
 */
export function shouldAutoApprove(actionType: string): boolean {
  const config = getActionConfig(actionType);
  return config.autoApprove === true;
}

/**
 * Check if an action is GM-only
 */
export function isGmOnly(actionType: string): boolean {
  const config = getActionConfig(actionType);
  return config.gmOnly === true;
}

/**
 * Generate approval message for an action request
 */
export function generateApprovalMessage(request: GameActionRequest): string {
  const config = getActionConfig(request.action);
  if (config.approvalMessage) {
    return config.approvalMessage(request);
  }
  return `wants to perform action: ${request.action}`;
}

/**
 * Register a new action configuration
 * Useful for plugins to register their own action types
 */
export function registerActionConfig(actionType: string, config: ActionConfig): void {
  actionConfigs[actionType] = config;
  console.log(`[ActionConfigRegistry] Registered action config for: ${actionType}`, config);
}