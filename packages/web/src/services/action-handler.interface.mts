/**
 * New Action Handler Interface for Plugin-Aware Action System
 * 
 * This interface supports multi-handler architecture where multiple handlers
 * can be registered for the same action type (core + plugin handlers).
 */

import type { GameActionRequest } from '@dungeon-lab/shared/types/game-actions.mjs';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { AsyncActionContext } from '@dungeon-lab/shared/interfaces/action-context.interface.mjs';

/**
 * Validation result returned by action handlers
 */
export interface ValidationResult {
  valid: boolean;
  error?: { 
    code: string; 
    message: string; 
  };
  resourceCosts?: ResourceCost[];
}

/**
 * Resource cost information for validation display
 */
export interface ResourceCost {
  resourcePath: string;    // Path within document (e.g., 'spellSlotsUsed.level1')
  amount: number;          // Amount to consume
  storageType: 'data' | 'state';  // 'data' = pluginData, 'state' = document state
}

/**
 * Game effect for visual feedback
 */
export interface GameEffect {
  type: string;            // Effect type (explosion, spell cast, etc.)
  position?: { x: number; y: number };
  radius?: number;
  color?: string;
  duration?: number;
}

/**
 * Action Handler Interface
 * 
 * Handlers can implement validate() and/or execute() methods.
 * Multiple handlers can be registered for the same action type.
 */
export interface ActionHandler {
  // Metadata
  pluginId?: string;           // undefined = core handler
  priority?: number;           // Lower = runs first (core = 0, plugins = 100+)
  
  // Approval workflow (simplified)
  requiresManualApproval?: boolean;  // Default: false = auto-execute
  gmOnly?: boolean;                  // Default: false = players can use
  
  // Lifecycle methods (both optional)
  validate?: (
    request: GameActionRequest, 
    gameState: ServerGameStateWithVirtuals
  ) => Promise<ValidationResult>;
  
  execute?: (
    request: GameActionRequest, 
    draft: ServerGameStateWithVirtuals,
    context?: AsyncActionContext
  ) => Promise<void>;
  
  // UI/UX
  approvalMessage?: (request: GameActionRequest) => string;
}

