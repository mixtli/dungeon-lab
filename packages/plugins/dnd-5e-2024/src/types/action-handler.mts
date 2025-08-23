/**
 * D&D 5e Action Handler Types
 * 
 * Extended action handler interfaces that support async validation and execution.
 * The base ActionHandler interface from shared-ui doesn't support async functions,
 * but the actual runtime does.
 */

import type { GameActionRequest, ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';
import type { ActionHandler, ActionValidationResult } from '@dungeon-lab/shared-ui/types/plugin-context.mjs';

/**
 * Async-compatible Action Handler interface
 * Extends the base ActionHandler to support async validation and execution
 */
export interface AsyncActionHandler extends Omit<ActionHandler, 'validate' | 'execute'> {
  validate?: (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => Promise<ActionValidationResult>;
  execute?: (request: GameActionRequest, draft: ServerGameStateWithVirtuals) => Promise<void>;
}

/**
 * Sync/Async compatible Action Handler interface
 * Allows handlers to be either sync or async
 */
export interface FlexibleActionHandler extends Omit<ActionHandler, 'validate' | 'execute'> {
  validate?: (request: GameActionRequest, gameState: ServerGameStateWithVirtuals) => ActionValidationResult | Promise<ActionValidationResult>;
  execute?: (request: GameActionRequest, draft: ServerGameStateWithVirtuals) => void | Promise<void>;
}