import { z } from '../lib/zod.mjs';
import { zId } from '@zodyac/zod-mongoose';

// Game Session Status enum
export const GameSessionStatus = z.enum(['active', 'paused', 'ended']);


// Base GameSession schema
export const gameSessionSchema = z.object({
  name: z.string().min(1).max(255),
  campaignId: zId('Campaign'),
  description: z.string().optional(),
  status: GameSessionStatus.default('active'),
  participants: z.array(zId('User')),
  gameMasterId: zId('User'),
  settings: z.record(z.string(), z.unknown()).optional(),
  createdBy: zId('User'),
  updatedBy: zId('User'),
});

// Create data schema (omits auto-generated fields)
export const gameSessionCreateSchema = gameSessionSchema.omit({
  createdBy: true,
  updatedBy: true,
  participants: true,
}).extend({
  participants: z.array(zId('User')).default([]),
});

// Update data schema (makes all fields optional except updatedBy)
export const gameSessionUpdateSchema = gameSessionSchema
  .omit({
    createdBy: true,
  })
  .partial()
  .extend({
    updatedBy: zId('User'),
  });

// Export types generated from the schemas
export type IGameSession = z.infer<typeof gameSessionSchema>;
export type IGameSessionCreateData = z.infer<typeof gameSessionCreateSchema>;
export type IGameSessionUpdateData = z.infer<typeof gameSessionUpdateSchema>; 