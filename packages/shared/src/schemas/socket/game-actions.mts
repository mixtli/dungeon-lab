import { z } from 'zod';

/**
 * Socket schemas for GameAction request/response system
 */

// Extract game action type enum as single source of truth
export const gameActionTypeSchema = z.enum([
  'move-token',
  'remove-token',
  'add-document',
  'update-document',
  'assign-item',
  'end-turn',
  'roll-initiative',
  'start-encounter',
  'stop-encounter'
]);

// Basic GameAction request schema
export const gameActionRequestSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  sessionId: z.string(),
  timestamp: z.number(),
  action: z.string(),
  actorId: z.string().optional(), // Optional: The document ID of the acting character/actor (required by some actions)
  actorTokenId: z.string().optional(), // Optional: Token ID for positioning/range calculations
  targetTokenIds: z.array(z.string()).optional(), // Optional: Target token IDs for targeted actions
  parameters: z.record(z.unknown()), // Action-specific parameters only
  description: z.string().optional()
});

// Response from server about action request
export const actionRequestResponseSchema = z.object({
  success: z.boolean(),
  approved: z.boolean().optional(),
  requestId: z.string(),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).optional()
});

// Args schemas for socket events
export const gameActionRequestArgsSchema = z.tuple([
  gameActionRequestSchema,
  z.function().args(actionRequestResponseSchema).returns(z.void())
]);

// GM request args schema (no callback when forwarded)
export const gameActionGmRequestArgsSchema = z.tuple([
  gameActionRequestSchema
]);

// Response args schema - GM response to server
export const gameActionResponseArgsSchema = z.tuple([
  actionRequestResponseSchema
]);

// Approval event schemas
export const gameActionApprovalArgsSchema = z.tuple([
  z.object({
    requestId: z.string(),
    playerId: z.string()
  })
]);

export const gameActionDenialArgsSchema = z.tuple([
  z.object({
    requestId: z.string(),
    playerId: z.string(),
    reason: z.string().optional()
  })
]);

export const gameActionApprovedArgsSchema = z.tuple([
  z.object({
    requestId: z.string()
  })
]);

export const gameActionDeniedArgsSchema = z.tuple([
  z.object({
    requestId: z.string(),
    reason: z.string()
  })
]);

// Exports for socket event integration
export type GameActionRequestArgs = z.infer<typeof gameActionRequestArgsSchema>;
export type GameActionGmRequestArgs = z.infer<typeof gameActionGmRequestArgsSchema>;
export type GameActionResponseArgs = z.infer<typeof gameActionResponseArgsSchema>;
export type GameActionApprovalArgs = z.infer<typeof gameActionApprovalArgsSchema>;
export type GameActionDenialArgs = z.infer<typeof gameActionDenialArgsSchema>;
export type GameActionApprovedArgs = z.infer<typeof gameActionApprovedArgsSchema>;
export type GameActionDeniedArgs = z.infer<typeof gameActionDeniedArgsSchema>;
export type GameActionRequest = z.infer<typeof gameActionRequestSchema>;
export type ActionRequestResponse = z.infer<typeof actionRequestResponseSchema>;
export type GameActionType = z.infer<typeof gameActionTypeSchema>;