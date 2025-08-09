import { z } from 'zod';

/**
 * Turn Manager Schema
 * 
 * Defines universal turn-based system concepts that work across all game systems.
 * Game-specific mechanics are handled by plugins through the extensible data fields.
 */

export const turnParticipantSchema = z.object({
  id: z.string(),
  name: z.string(),
  actorId: z.string().optional(),
  tokenId: z.string().optional(),
  hasActed: z.boolean().default(false),
  turnOrder: z.number(),
  participantData: z.record(z.string(), z.unknown()).optional()
});

export const turnManagerSchema = z.object({
  isActive: z.boolean().default(false),
  currentTurn: z.number().default(0),
  round: z.number().default(1),
  phase: z.string().optional(),
  participants: z.array(turnParticipantSchema).default([]),
  turnData: z.record(z.string(), z.unknown()).optional()
});

export type ITurnParticipant = z.infer<typeof turnParticipantSchema>;
export type ITurnManager = z.infer<typeof turnManagerSchema>;