/**
 * Turn State Management Types
 * 
 * These types handle tracking ephemeral per-turn resource usage for the active participant.
 * This system integrates with the existing Turn Manager as a utility service for resource tracking.
 * 
 * Key principles:
 * - Only tracks resources for the ACTIVE participant (not all participants)
 * - Does NOT duplicate turn progression (Turn Manager handles that)
 * - Game-agnostic core with plugin extensibility for game-specific resources
 * - Ephemeral data that resets each turn
 */

/**
 * Movement state for the active participant during their turn
 * Universal concept that applies to all game systems
 */
export interface MovementState {
  /** Maximum movement allowed this turn (in grid cells) */
  maximum: number;
  
  /** Movement used so far this turn (in grid cells) */
  used: number;
  
  /** Remaining movement this turn (calculated: maximum - used) */
  remaining: number;
}

/**
 * Generic resource state for plugin-defined resources
 * Allows plugins to track any type of consumable resource
 */
export interface GenericResourceState {
  /** Unique identifier for this resource type */
  resourceId: string;
  
  /** Current value of the resource */
  current: number;
  
  /** Maximum value of the resource */
  maximum: number;
  
  /** Plugin-specific metadata (e.g., reset conditions, display info) */
  metadata: Record<string, unknown>;
}

/**
 * Turn state for the active participant only
 * Tracks ephemeral resources that are consumed during a single turn
 */
export interface ParticipantTurnState {
  /** Document ID of the active participant */
  documentId: string;
  
  /** Document type ('character' or 'actor') */
  documentType: string;
  
  /** Movement state for this turn (universal concept) */
  movement: MovementState;
  
  /** Generic resources managed by plugins */
  resources: GenericResourceState[];
  
  /** Plugin-specific turn state data */
  pluginData: Record<string, unknown>;
  
  /** Timestamp when state was last updated */
  lastUpdated: number;
}

/**
 * Events emitted by turn state service
 * Focused on resource usage, not turn progression (Turn Manager handles that)
 */
export interface TurnStateEvents {
  /** Emitted when movement is used */
  'movement-used': {
    participantId: string;
    amount: number;
    remaining: number;
  };
  
  /** Emitted when a generic resource is used */
  'resource-used': {
    participantId: string;
    resourceId: string;
    amount: number;
    remaining: number;
  };
  
  /** Emitted when turn state is reset (new turn started) */
  'turn-state-reset': {
    participantId: string;
    state: ParticipantTurnState;
  };
}