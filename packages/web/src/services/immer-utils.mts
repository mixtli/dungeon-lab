/**
 * Immer utilities for game state management
 */

import { produce, enablePatches, Patch } from 'immer';
import type { ServerGameStateWithVirtuals } from '@dungeon-lab/shared/types/index.mjs';

// Enable patches for Immer
enablePatches();

/**
 * Produces game state changes with JSON patches for synchronization
 */
export async function produceGameStateChanges(
  baseState: ServerGameStateWithVirtuals,
  recipe: (draft: ServerGameStateWithVirtuals) => void
): Promise<[ServerGameStateWithVirtuals, Patch[]]> {
  return produce(baseState, recipe, (patches) => patches) as unknown as [ServerGameStateWithVirtuals, Patch[]];
}