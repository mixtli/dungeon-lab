/**
 * Core Game Action Request System Types
 * 
 * This file defines the types for the core player action request system.
 * Only core VTT actions are defined here. Game-specific actions (D&D spells, etc.)
 * should be handled by plugins.
 */

/**
 * Core action types that can be requested
 */
export type GameActionType = 'move-token' | 'add-document';

/**
 * Core game action request interface
 */
export interface GameActionRequest {
  id: string;
  playerId: string;
  sessionId: string;
  timestamp: number;
  action: GameActionType;
  parameters: Record<string, unknown>;
  description?: string;
}

/**
 * Response to an action request
 */
export interface ActionRequestResponse {
  success: boolean;
  approved?: boolean;
  requestId: string;
  error?: {
    code: string;
    message: string;
  };
}

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
    x: number;
    y: number;
    elevation?: number;
  };
  distance?: number;
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