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
  action: z.enum(['move-token', 'add-document']),
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

// GM request args schema (no callback when forwarded)
export const gameActionGmRequestArgsSchema = z.tuple([
  gameActionRequestSchema
]);

// Response args schema - GM response to server
export const gameActionResponseArgsSchema = z.tuple([
  actionRequestResponseSchema
]);

// Exports for socket event integration
export type GameActionRequestArgs = z.infer<typeof gameActionRequestArgsSchema>;
export type GameActionGmRequestArgs = z.infer<typeof gameActionGmRequestArgsSchema>;
export type GameActionResponseArgs = z.infer<typeof gameActionResponseArgsSchema>;
export type GameActionRequest = z.infer<typeof gameActionRequestSchema>;
export type ActionRequestResponse = z.infer<typeof actionRequestResponseSchema>;