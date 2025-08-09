import { createHash } from 'crypto';
import type { ServerGameState } from '@dungeon-lab/shared/schemas/server-game-state.schema.mjs';

/**
 * Sort object keys recursively to ensure consistent JSON serialization
 * This ensures the same object always produces the same hash
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  if (typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    
    return sorted;
  }
  
  return obj;
}

/**
 * Generate a hash of the game state for integrity verification
 * Uses SHA-256 to create a consistent hash of the pure game state data
 * 
 * @param gameState - The server game state to hash
 * @returns SHA-256 hash as hexadecimal string
 */
export function generateStateHash(gameState: ServerGameState): string {
  try {
    // Sort keys to ensure consistent serialization
    const sortedState = sortObjectKeys(gameState);
    
    // Serialize to JSON
    const stateJson = JSON.stringify(sortedState);
    
    // Generate SHA-256 hash
    const hash = createHash('sha256');
    hash.update(stateJson, 'utf8');
    
    return hash.digest('hex');
  } catch (error) {
    console.error('Error generating state hash:', error);
    throw new Error('Failed to generate state hash');
  }
}

/**
 * Validate state integrity by comparing expected hash with actual hash
 * 
 * @param gameState - The server game state to validate
 * @param expectedHash - The expected hash value
 * @returns true if state integrity is valid, false otherwise
 */
export function validateStateIntegrity(
  gameState: ServerGameState, 
  expectedHash: string
): boolean {
  try {
    const actualHash = generateStateHash(gameState);
    return actualHash === expectedHash;
  } catch (error) {
    console.error('Error validating state integrity:', error);
    return false;
  }
}

/**
 * Increment the state version number
 * Simple incrementing integer stored as string
 * 
 * @param currentVersion - Current version string (e.g., "5")
 * @returns Next version string (e.g., "6")
 */
export function incrementStateVersion(currentVersion: string | null): string {
  const current = parseInt(currentVersion || '0') || 0;
  return (current + 1).toString();
}

/**
 * Check if an incoming version matches the current server version
 * 
 * @param currentVersion - Current version on server
 * @param incomingVersion - Version from client request (should match current server version)
 * @returns true if incoming version matches current server version
 */
export function isValidNextVersion(currentVersion: string | null, incomingVersion: string): boolean {
  // Client should send their current version, which should match server's current version
  const serverVersion = currentVersion || '0';
  return serverVersion === incomingVersion;
}