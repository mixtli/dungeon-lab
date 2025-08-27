/**
 * Core Game Action Request System Types
 * 
 * This file defines the types for the core player action request system.
 * Only core VTT actions are defined here. Game-specific actions (D&D spells, etc.)
 * should be handled by plugins.
 */

// Re-export Zod-inferred types as single source of truth
export type {
  GameActionType,
  GameActionRequest,
  ActionRequestResponse
} from '../schemas/socket/game-actions.mjs';

// Import for use in interfaces below
import type {
  GameActionRequest,
  ActionRequestResponse
} from '../schemas/socket/game-actions.mjs';

/**
 * Result of requesting an action
 */
export interface ActionRequestResult {
  success: boolean;
  approved: boolean;
  requestId: string;
  error?: string;
}

/**
 * Token movement action parameters
 */
export interface MoveTokenParameters extends Record<string, unknown> {
  tokenId: string;
  newPosition: {
    x: number; // World coordinates
    y: number; // World coordinates
    elevation?: number;
  };
  distance?: number; // Distance in world pixels
}

/**
 * Token removal action parameters
 */
export interface RemoveTokenParameters extends Record<string, unknown> {
  tokenId: string;
  tokenName: string; // For user-friendly messaging
}

/**
 * Document addition action parameters
 */
export interface AddDocumentParameters extends Record<string, unknown> {
  compendiumId: string;
  entryId: string;
  documentData: Record<string, unknown>;
}

/**
 * Document removal action parameters
 */
export interface RemoveDocumentParameters extends Record<string, unknown> {
  documentId: string;
  documentName?: string; // For user-friendly messaging
  documentType?: string; // For context in GM approval
}

/**
 * Document update action parameters
 */
export interface UpdateDocumentParameters extends Record<string, unknown> {
  documentId: string;
  operations: import('../schemas/game-state-update.schema.mjs').JsonPatchOperation[];
  documentName?: string; // For user-friendly messaging
  documentType?: string; // For context in GM approval
}

/**
 * End turn action parameters
 */
export type EndTurnParameters = Record<string, unknown>;

/**
 * Roll initiative action parameters
 */
export interface RollInitiativeParameters extends Record<string, unknown> {
  participants?: string[]; // Optional: specific participants to reroll
}

/**
 * Start encounter action parameters
 */
export interface StartEncounterParameters extends Record<string, unknown> {
  encounterId: string;
}

/**
 * Stop encounter action parameters
 */
export interface StopEncounterParameters extends Record<string, unknown> {
  encounterId: string;
}

/**
 * Assign item action parameters
 */
export interface AssignItemParameters extends Record<string, unknown> {
  itemId: string;
  targetCharacterId: string;
  itemName?: string; // For user-friendly messaging
  targetCharacterName?: string; // For user-friendly messaging
}

/**
 * Socket events for action requests
 */
export interface GameActionSocketEvents {
  // Player → Server
  'gameAction:request': (request: GameActionRequest, callback: (response: ActionRequestResponse) => void) => void;
  
  // Server → GM
  'gameAction:requestReceived': (request: GameActionRequest) => void;
  
  // GM → Server  
  'gameAction:approve': (data: { requestId: string; playerId: string }) => void;
  'gameAction:deny': (data: { requestId: string; playerId: string; reason?: string }) => void;
  
  // Server → Player
  'gameAction:approved': (data: { requestId: string }) => void;
  'gameAction:denied': (data: { requestId: string; reason: string }) => void;
}