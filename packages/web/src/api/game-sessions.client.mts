import api from './axios.mts';
import type {
  IGameSession,
  CreateGameSessionRequest,
  UpdateGameSessionRequest,
  GameSessionStatusUpdateRequest,
  GameSessionQueryParams
} from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Fetch all game sessions with optional filters
 */
export async function fetchGameSessions(filter?: GameSessionQueryParams): Promise<IGameSession[]> {
  // Build query parameters
  const params = new URLSearchParams();
  if (filter?.campaignId) {
    params.append('campaignId', filter.campaignId);
  }
  if (filter?.status) {
    params.append('status', filter.status);
  }

  const response = await api.get(
    `/api/game-sessions${params.toString() ? `?${params.toString()}` : ''}`
  );
  return response.data;
}

/**
 * Fetch a specific game session by ID
 */
export async function fetchGameSession(id: string): Promise<IGameSession> {
  const response = await api.get(`/api/game-sessions/${id}`);
  return response.data;
}

/**
 * Fetch all game sessions for a specific campaign
 */
export async function fetchCampaignSessions(campaignId: string): Promise<IGameSession[]> {
  return fetchGameSessions({ campaignId });
}

/**
 * Create a new game session
 */
export async function createGameSession(data: CreateGameSessionRequest): Promise<IGameSession> {
  const response = await api.post('/api/game-sessions', data);
  return response.data;
}

/**
 * Update a game session status
 */
export async function updateGameSessionStatus(id: string, status: string): Promise<IGameSession> {
  const request: GameSessionStatusUpdateRequest = { status };
  const response = await api.patch(`/api/game-sessions/${id}/status`, request);
  return response.data;
}

/**
 * Delete a game session
 */
export async function deleteGameSession(id: string): Promise<void> {
  await api.delete(`/api/game-sessions/${id}`);
}

export async function getGameSession(sessionId: string): Promise<IGameSession> {
  const response = await api.get(`/api/game-sessions/${sessionId}`);
  return response.data;
}

export async function updateGameSession(
  sessionId: string,
  data: UpdateGameSessionRequest
): Promise<IGameSession> {
  const response = await api.patch(`/api/game-sessions/${sessionId}`, data);
  return response.data;
}

export async function getGameSessionsByCampaign(campaignId: string): Promise<IGameSession[]> {
  const response = await api.get(`/api/campaigns/${campaignId}/game-sessions`);
  return response.data;
}

export async function startGameSession(sessionId: string): Promise<IGameSession> {
  const response = await api.post(`/api/game-sessions/${sessionId}/start`);
  return response.data;
}

export async function endGameSession(sessionId: string): Promise<IGameSession> {
  const response = await api.post(`/api/game-sessions/${sessionId}/end`);
  return response.data;
}

export async function joinGameSession(sessionId: string): Promise<void> {
  await api.post(`/api/game-sessions/${sessionId}/join`);
}

export async function leaveGameSession(sessionId: string): Promise<void> {
  await api.post(`/api/game-sessions/${sessionId}/leave`);
}
