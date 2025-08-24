import type { RollServerResult } from '../types/socket/index.mjs';

/**
 * Action that should be taken as a follow-up to a roll
 */
export interface FollowUpAction {
  type: 'roll-request' | 'action-request' | 'chat-message';
  data: unknown;
}

/**
 * Roll request follow-up action
 */
export interface FollowUpRollRequest extends FollowUpAction {
  type: 'roll-request';
  data: {
    playerId: string;
    rollType: string;
    rollData: {
      message?: string;
      dice: Array<{ sides: number; quantity: number }>;
      metadata?: Record<string, unknown>;
    };
  };
}

/**
 * Action request follow-up action (e.g., apply damage)
 */
export interface FollowUpActionRequest extends FollowUpAction {
  type: 'action-request';
  data: {
    actionType: string;
    parameters: Record<string, unknown>;
    options?: Record<string, unknown>;
  };
}

/**
 * Chat message follow-up action
 */
export interface FollowUpChatMessage extends FollowUpAction {
  type: 'chat-message';
  data: {
    message: string;
    options?: {
      type?: 'text' | 'roll';
      rollData?: RollServerResult & Record<string, unknown>;
      recipient?: 'public' | 'gm' | 'private';
    };
  };
}

/**
 * Result of processing a roll through a roll handler
 * Contains augmented data and side effects to be executed
 */
export interface ProcessedRollResult {
  /** Original roll result with any modifications */
  rollResult: RollServerResult & {
    /** Calculated final total for the roll */
    calculatedTotal?: number;
    /** Whether this roll was a critical hit */
    isCriticalHit?: boolean;
    /** Additional processed metadata */
    processedData?: Record<string, unknown>;
  };

  /** Follow-up actions to be executed (roll requests, action requests, chat messages) */
  followUpActions: FollowUpAction[];

  /** Whether this roll should trigger default side effects (for backward compatibility) */
  executeDefaultSideEffects: boolean;

  /** Processing metadata for debugging and logging */
  processingInfo: {
    handlerType: string;
    calculationDetails?: Record<string, unknown>;
    warnings?: string[];
  };
}

/**
 * Union type for all specific follow-up action types
 */
export type SpecificFollowUpAction = FollowUpRollRequest | FollowUpActionRequest | FollowUpChatMessage;