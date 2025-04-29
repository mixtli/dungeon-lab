import api from './api.client.mjs';
import type { IGameSession } from '@dungeon-lab/shared/schemas/game-session.schema.mjs';
import {
  CreateGameSessionRequest,
  UpdateGameSessionRequest,
  GetGameSessionResponse,
  GetGameSessionsResponse,
  CreateGameSessionResponse,
  UpdateGameSessionResponse,
  GameSessionStatusUpdateRequest
} from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Fetch a specific game session by ID
 */
export async function getGameSession(sessionId: string): Promise<IGameSession | undefined> {
  const response = await api.get<GetGameSessionResponse>(`/api/game-sessions/${sessionId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get game session');
  }
  return response.data.data;
}

/**
 * Fetch all game sessions with optional filters
 */
export async function getGameSessions(
  campaignId?: string,
  status?: string
): Promise<IGameSession[]> {
  const params = new URLSearchParams();
  if (campaignId) params.append('campaignId', campaignId);
  if (status) params.append('status', status);

  const response = await api.get<GetGameSessionsResponse>('/api/game-sessions', {
    params
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get game sessions');
  }
  return response.data.data;
}

/**
 * Fetch all game sessions for a specific campaign
 */
export async function getCampaignSessions(campaignId: string): Promise<IGameSession[]> {
  const response = await api.get<GetGameSessionsResponse>(`/api/campaigns/${campaignId}/sessions`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get campaign sessions');
  }
  return response.data.data;
}

/**
 * Create a new game session
 */
export async function createGameSession(
  data: CreateGameSessionRequest
): Promise<IGameSession | undefined> {
  const response = await api.post<CreateGameSessionResponse>('/api/game-sessions', data);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create game session');
  }
  return response.data.data;
}

/**
 * Update a game session
 */
export async function updateGameSession(
  sessionId: string,
  data: UpdateGameSessionRequest
): Promise<IGameSession | undefined> {
  const response = await api.patch<UpdateGameSessionResponse>(
    `/api/game-sessions/${sessionId}`,
    data
  );

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update game session');
  }
  return response.data.data;
}

/**
 * Update a game session status
 */
export async function updateGameSessionStatus(
  sessionId: string,
  status: 'active' | 'paused' | 'ended' | 'scheduled'
): Promise<IGameSession | undefined> {
  const request: GameSessionStatusUpdateRequest = { status };
  const response = await api.patch<UpdateGameSessionResponse>(
    `/api/game-sessions/${sessionId}/status`,
    request
  );

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update game session status');
  }
  return response.data.data;
}

/**
 * Delete a game session
 */
export async function deleteGameSession(sessionId: string): Promise<void> {
  const response = await api.delete(`/api/game-sessions/${sessionId}`);
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to delete game session');
  }
}

/**
 * Start a game session
 */
export async function startGameSession(sessionId: string): Promise<IGameSession | undefined> {
  const response = await api.post<UpdateGameSessionResponse>(
    `/api/game-sessions/${sessionId}/start`
  );

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to start game session');
  }
  return response.data.data;
}

/**
 * End a game session
 */
export async function endGameSession(sessionId: string): Promise<IGameSession | undefined> {
  const response = await api.post<UpdateGameSessionResponse>(`/api/game-sessions/${sessionId}/end`);

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to end game session');
  }
  return response.data.data;
}

/**
 * Join a game session
 */
export async function joinGameSession(sessionId: string): Promise<void> {
  const response = await api.post(`/api/game-sessions/${sessionId}/join`);

  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to join game session');
  }
}

/**
 * Leave a game session
 */
export async function leaveGameSession(sessionId: string): Promise<void> {
  const response = await api.post(`/api/game-sessions/${sessionId}/leave`);

  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to leave game session');
  }
}
