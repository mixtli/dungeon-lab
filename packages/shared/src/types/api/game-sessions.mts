import { z } from 'zod';
import { gameSessionSchema } from '../../schemas/game-session.schema.mjs';
import { baseAPIResponseSchema } from './base.mjs';
import type { IGameSession } from '../index.mjs';
// Game Session API Types
export interface GameSessionListResponse {
  data: IGameSession[];
  total: number;
}

export interface GameSessionResponse {
  data: IGameSession;
}

export const createGameSessionSchema = gameSessionSchema.omit({
  id: true,
  participantIds: true,
  characterIds: true
});

export type CreateGameSessionRequest = z.infer<typeof createGameSessionSchema>;

export interface GameSessionStatusUpdateRequest {
  status: 'active' | 'paused' | 'ended' | 'scheduled';
}

export interface GameSessionParams {
  id: string;
}

export interface GameSessionQueryParams {
  campaignId?: string;
  status?: string;
}

// Zod schemas for API validation
// Types for GET /game-sessions (Get all game sessions)
export const getGameSessionsQuerySchema = z
  .object({
    campaignId: z.string().optional(),
    status: z.string().optional()
  })
  .passthrough();

export type GetGameSessionsQuery = z.infer<typeof getGameSessionsQuerySchema>;

export const getGameSessionsResponseSchema = baseAPIResponseSchema.extend({
  data: z.array(gameSessionSchema)
});

export type GetGameSessionsResponse = z.infer<typeof getGameSessionsResponseSchema>;

// Types for GET /game-sessions/:id (Get one game session)
export const getGameSessionResponseSchema = baseAPIResponseSchema.extend({
  data: gameSessionSchema.optional()
});

export type GetGameSessionResponse = z.infer<typeof getGameSessionResponseSchema>;

// Types for GET /campaigns/:campaignId/game-sessions (Get campaign sessions)
export const getCampaignSessionsResponseSchema = getGameSessionsResponseSchema;
export type GetCampaignSessionsResponse = z.infer<typeof getCampaignSessionsResponseSchema>;

export const createGameSessionResponseSchema = baseAPIResponseSchema.extend({
  data: gameSessionSchema.optional()
});

export type CreateGameSessionResponse = z.infer<typeof createGameSessionResponseSchema>;

// Types for PUT/PATCH /game-sessions/:id (Update game session)
export const updateGameSessionSchema = createGameSessionSchema.partial();
export type UpdateGameSessionRequest = z.infer<typeof updateGameSessionSchema>;

export const updateGameSessionResponseSchema = baseAPIResponseSchema.extend({
  data: gameSessionSchema.optional()
});

export type UpdateGameSessionResponse = z.infer<typeof updateGameSessionResponseSchema>;

// Types for DELETE /game-sessions/:id (Delete game session)
export const deleteGameSessionResponseSchema = baseAPIResponseSchema.extend({
  data: z.undefined()
});

export type DeleteGameSessionResponse = z.infer<typeof deleteGameSessionResponseSchema>;
