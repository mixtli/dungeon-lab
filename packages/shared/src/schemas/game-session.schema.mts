import { z } from '../lib/zod.mjs';

// Game Session Status enum
export const GameSessionStatus = z.enum(['active', 'paused', 'ended', 'scheduled']);

// Base GameSession schema
export const gameSessionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  campaignId: z.string(),
  description: z.string().optional(),
  status: GameSessionStatus.default('scheduled'),
  participants: z.array(z.string()),
  gameMasterId: z.string(),
  settings: z.record(z.string(), z.unknown()).optional(),
  createdBy: z.string(),
  updatedBy: z.string(),
});

// Create data schema (omits auto-generated fields)
export const gameSessionCreateSchema = gameSessionSchema.omit({
  id: true,
  createdBy: true,
  updatedBy: true,
  participants: true,
}).extend({
  participants: z.array(z.string()).default([]),
});

// Update data schema (makes all fields optional except updatedBy)
export const gameSessionUpdateSchema = gameSessionSchema
  .omit({
    id: true,
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: z.string(),
  });

// Export types generated from the schemas
export type IGameSession = z.infer<typeof gameSessionSchema>;
export type IGameSessionCreateData = z.infer<typeof gameSessionCreateSchema>;
export type IGameSessionUpdateData = z.infer<typeof gameSessionUpdateSchema>; 