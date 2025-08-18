/**
 * Shared types for action handlers
 */

import type { JsonPatchOperation } from '@dungeon-lab/shared/types/index.mjs';

export interface ActionHandlerResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
  /** JSON patch operations to apply to game state. Only present on success. */
  stateOperations?: JsonPatchOperation[];
}