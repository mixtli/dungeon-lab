import type { JsonPatchOperation, ServerGameStateWithVirtuals } from '../types/index.mjs';
import { applyPatch, deepClone, compare } from 'fast-json-patch/index.mjs';
import type { Operation } from 'fast-json-patch';

/**
 * Shared game state operation utilities using JSON Patch (RFC 6902)
 * Used by both server and client to ensure consistent state transformations
 */
export class GameStateOperations {
  /**
   * Apply multiple JSON Patch operations to game state
   */
  static applyOperations(gameState: ServerGameStateWithVirtuals, operations: JsonPatchOperation[]): ServerGameStateWithVirtuals {
    // Deep clone the state to avoid mutation
    const clonedState = deepClone(gameState);
    
    // Convert our JsonPatchOperation format to fast-json-patch Operation format
    const patchOperations: Operation[] = operations.map(op => ({
      op: op.op,
      path: op.path,
      value: op.value,
      from: op.from
    } as Operation));
    
    // Apply the patch operations
    const result = applyPatch(clonedState, patchOperations);
    
    return result.newDocument;
  }

  /**
   * Apply JSON Patch operations in-place to preserve Vue reactivity references
   * This method mutates the existing object to maintain Vue's reactivity tracking
   */
  static applyOperationsInPlace(gameState: ServerGameStateWithVirtuals, operations: JsonPatchOperation[]): void {
    // Convert our JsonPatchOperation format to fast-json-patch Operation format
    const patchOperations: Operation[] = operations.map(op => ({
      op: op.op,
      path: op.path,
      value: op.value,
      from: op.from
    } as Operation));
    
    // Apply patches directly to the original object (mutating it)
    // This preserves Vue's reactivity tracking for unchanged portions
    console.log("gameState", gameState)
    applyPatch(gameState, patchOperations, /* validateOperation */ false, /* mutateDocument */ true);
  }

  /**
   * Apply a single JSON Patch operation to game state
   */
  static applyOperation(gameState: ServerGameStateWithVirtuals, operation: JsonPatchOperation): ServerGameStateWithVirtuals {
    return GameStateOperations.applyOperations(gameState, [operation]);
  }

  /**
   * Generate JSON Patch operations from comparing two states
   * Uses fast-json-patch to generate RFC 6902 compliant operations
   */
  static generatePatch(oldState: Record<string, unknown>, newState: Record<string, unknown>): JsonPatchOperation[] {
    const operations = compare(oldState, newState);
    
    // Convert fast-json-patch Operation format to our JsonPatchOperation format
    return operations.map(op => ({
      op: op.op,
      path: op.path,
      value: 'value' in op ? op.value : undefined,
      from: 'from' in op ? op.from : undefined,
      // previous value can be calculated if needed for rollbacks
    } as JsonPatchOperation));
  }

  /**
   * Generate JSON Patch operations for document updates
   * Compares the original document state with the updated document state and generates patch operations
   */
  static generateDocumentPatch(
    originalDocument: Record<string, unknown>,
    updatedDocument: Record<string, unknown>,
    documentId: string
  ): JsonPatchOperation[] {
    // Create minimal state objects for comparison
    const originalState = { documents: { [documentId]: originalDocument } };
    const updatedState = { documents: { [documentId]: updatedDocument } };
    
    // Generate the patch using fast-json-patch
    return GameStateOperations.generatePatch(originalState, updatedState);
  }
}

// Export standalone functions for backwards compatibility and easier usage
export const applyOperations = GameStateOperations.applyOperations;
export const applyOperationsInPlace = GameStateOperations.applyOperationsInPlace;
export const applyOperation = GameStateOperations.applyOperation;
export const generatePatch = GameStateOperations.generatePatch;
export const generateDocumentPatch = GameStateOperations.generateDocumentPatch;

// Legacy exports - replaced by JSON Patch functions
export const convertDiffToStateOperations = GameStateOperations.generateDocumentPatch;