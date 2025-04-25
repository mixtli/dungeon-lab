import type { IGameSession } from '../../schemas/game-session.schema.mjs';
export type { IGameSession };

// Game Session API Types
export interface GameSessionListResponse {
  data: IGameSession[];
  total: number;
}

export interface GameSessionResponse {
  data: IGameSession;
}

export interface CreateGameSessionRequest {
  name: string;
  campaignId: string;
  description?: string;
  status?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateGameSessionRequest {
  name?: string;
  description?: string;
  status?: string;
  participantIds?: string[];
  settings?: Record<string, unknown>;
}

export interface GameSessionStatusUpdateRequest {
  status: string;
}

export interface GameSessionParams {
  id: string;
}

export interface GameSessionQueryParams {
  campaignId?: string;
  status?: string;
}
