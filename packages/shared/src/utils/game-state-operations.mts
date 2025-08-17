import type { StateOperation, ServerGameStateWithVirtuals } from '../types/index.mjs';

/**
 * Shared game state operation utilities
 * Used by both server and client to ensure consistent state transformations
 */
export class GameStateOperations {
  /**
   * Apply multiple state operations to game state
   */
  static applyOperations(gameState: ServerGameStateWithVirtuals, operations: StateOperation[]): ServerGameStateWithVirtuals {
    let currentState = JSON.parse(JSON.stringify(gameState)); // Deep clone
    for (const operation of operations) {
      currentState = GameStateOperations.applyOperation(currentState, operation);
    }
    return currentState;
  }

  /**
   * Apply a single state operation using proper path parsing
   */
  static applyOperation(gameState: ServerGameStateWithVirtuals, operation: StateOperation): ServerGameStateWithVirtuals {
    const { path, operation: op, value } = operation;
    try {
      // Parse path into segments
      const pathSegments = GameStateOperations.parsePath(path);
      
      // Navigate to target location
      const { parent, key } = GameStateOperations.navigateToParent(gameState as Record<string, unknown>, pathSegments);
      
      // Apply operation
      switch (op) {
        case 'set':
          parent[key] = value;
          break;
          
        case 'unset':
          if (Array.isArray(parent)) {
            parent.splice(parseInt(key), 1);
          } else {
            delete parent[key];
          }
          break;
          
        case 'inc': {
          const currentValue = typeof parent[key] === 'number' ? parent[key] : 0;
          parent[key] = currentValue + (typeof value === 'number' ? value : 1);
          break;
        }
          
        case 'push':
          if (!Array.isArray(parent[key])) {
            parent[key] = [];
          }
          (parent[key] as unknown[]).push(value);
          break;
          
        case 'pull':
          if (Array.isArray(parent[key])) {
            const array = parent[key] as unknown[];
            const index = array.findIndex((item: unknown) => 
              GameStateOperations.matchesQuery(item, value)
            );
            if (index > -1) {
              array.splice(index, 1);
            }
          }
          break;
          
        default:
          throw new Error(`Unknown operation: ${op}`);
      }
      
      return gameState;
    } catch (error) {
      throw new Error(`Failed to apply operation ${op} at path ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a path string into segments, handling array indices and nested properties
   */
  static parsePath(path: string): string[] {
    // Handle paths like "characters.0.pluginData.hitPoints" or "characters[0].name"
    return path
      .replace(/\[(\d+)\]/g, '.$1') // Convert array notation to dot notation
      .split('.')
      .filter(segment => segment.length > 0);
  }

  /**
   * Navigate to the parent object/array of the target property
   */
  static navigateToParent(obj: Record<string, unknown>, pathSegments: string[]): { parent: Record<string, unknown>; key: string } {
    let current = obj;
    
    // Navigate to parent (all segments except the last)
    for (let i = 0; i < pathSegments.length - 1; i++) {
      const segment = pathSegments[i];
      
      if (current[segment] === undefined) {
        // Create intermediate objects/arrays as needed
        const nextSegment = pathSegments[i + 1];
        const isNextSegmentArrayIndex = /^\d+$/.test(nextSegment);
        current[segment] = isNextSegmentArrayIndex ? [] : {};
      }
      
      current = current[segment] as Record<string, unknown>;
    }
    
    const key = pathSegments[pathSegments.length - 1];
    return { parent: current, key };
  }

  /**
   * Check if an item matches a query object (MongoDB-style matching)
   * Used for $pull operations - matches if all query fields are present in the item
   */
  static matchesQuery(item: unknown, query: unknown): boolean {
    if (query == null || typeof query !== 'object') {
      return GameStateOperations.deepEqual(item, query);
    }
    
    if (item == null || typeof item !== 'object') {
      return false;
    }
    
    const queryObj = query as Record<string, unknown>;
    const itemObj = item as Record<string, unknown>;
    
    // Check if all query fields match the corresponding item fields
    for (const [key, value] of Object.entries(queryObj)) {
      if (!(key in itemObj) || !GameStateOperations.deepEqual(itemObj[key], value)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Deep equality check for objects/arrays
   */
  static deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        const aObj = a as Record<string, unknown>;
        const bObj = b as Record<string, unknown>;
        if (!keysB.includes(key) || !GameStateOperations.deepEqual(aObj[key], bObj[key])) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Convert deep-diff output to StateOperation array
   * Used for document update workflows where we need to send state operations
   */
  static convertDiffToStateOperations(
    diffArray: any[] | undefined,
    documentId: string
  ): StateOperation[] {
    if (!diffArray || diffArray.length === 0) {
      return [];
    }

    const operations: StateOperation[] = [];

    for (const change of diffArray) {
      try {
        // Build the full path including document prefix
        const pathPrefix = `documents.${documentId}`;
        const changePath = change.path ? change.path.join('.') : '';
        const fullPath = changePath ? `${pathPrefix}.${changePath}` : pathPrefix;

        switch (change.kind) {
          case 'E': // Edit - existing field changed
            operations.push({
              path: fullPath,
              operation: 'set',
              value: change.rhs
            });
            break;

          case 'N': // New - field added
            operations.push({
              path: fullPath,
              operation: 'set',
              value: change.rhs
            });
            break;

          case 'D': // Deleted - field removed
            operations.push({
              path: fullPath,
              operation: 'unset'
            });
            break;

          case 'A': // Array change
            const arrayPath = fullPath;
            
            // Array changes are complex - for now, let's handle them as simple set operations
            // at the specific array index where the change occurred
            if (change.index !== undefined && typeof change.index === 'number') {
              const indexPath = `${arrayPath}.${change.index}`;
              
              // Check if item was added, removed, or modified
              if (change.item && typeof change.item === 'object') {
                const item = change.item;
                
                if (item.kind === 'N') {
                  // Item added - use set at specific index
                  operations.push({
                    path: indexPath,
                    operation: 'set',
                    value: item.rhs
                  });
                } else if (item.kind === 'D') {
                  // Item removed - use unset at specific index
                  operations.push({
                    path: indexPath,
                    operation: 'unset'
                  });
                } else if (item.kind === 'E') {
                  // Item modified - use set at specific index
                  operations.push({
                    path: indexPath,
                    operation: 'set',
                    value: item.rhs
                  });
                }
              }
            }
            break;

          default:
            console.warn('[GameStateOperations] Unknown diff kind:', change.kind);
        }
      } catch (error) {
        console.error('[GameStateOperations] Error converting diff to state operation:', error, change);
      }
    }

    return operations;
  }
}

// Export standalone functions for backwards compatibility and easier usage
export const applyOperations = GameStateOperations.applyOperations;
export const applyOperation = GameStateOperations.applyOperation;
export const parsePath = GameStateOperations.parsePath;
export const navigateToParent = GameStateOperations.navigateToParent;
export const matchesQuery = GameStateOperations.matchesQuery;
export const deepEqual = GameStateOperations.deepEqual;
export const convertDiffToStateOperations = GameStateOperations.convertDiffToStateOperations;