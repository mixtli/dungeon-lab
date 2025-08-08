import { z } from 'zod';

/**
 * Socket schemas for GameAction request/response system
 */

// Basic GameAction request schema
export const gameActionRequestSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  sessionId: z.string(),
  timestamp: z.number(),
  action: z.literal('move-token'), // Only supporting move-token for now
  parameters: z.record(z.unknown()),
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

// GM request args schema - no callback, just the request
export const gameActionGmRequestArgsSchema = z.tuple([
  gameActionRequestSchema
]);

// GM response args schema - just the response
export const gameActionGmResponseArgsSchema = z.tuple([
  actionRequestResponseSchema
]);

// Exports for socket event integration
export type GameActionRequestArgs = z.infer<typeof gameActionRequestArgsSchema>;
export type GameActionGmRequestArgs = z.infer<typeof gameActionGmRequestArgsSchema>;
export type GameActionGmResponseArgs = z.infer<typeof gameActionGmResponseArgsSchema>;
export type GameActionRequest = z.infer<typeof gameActionRequestSchema>;
export type ActionRequestResponse = z.infer<typeof actionRequestResponseSchema>;