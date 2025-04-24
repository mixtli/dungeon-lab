import api from './axios.mjs';
import type { IGameSession } from '@dungeon-lab/shared/index.mjs';

// Interface to include frontend id
interface GameSessionWithId extends IGameSession {
  id: string;
}

// Interface for filter options
interface GameSessionFilter {
  campaignId?: string;
  status?: string;
}

/**
 * Fetch all game sessions with optional filters
 */
export async function fetchGameSessions(filter?: GameSessionFilter): Promise<GameSessionWithId[]> {
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
export async function fetchGameSession(id: string): Promise<GameSessionWithId> {
  const response = await api.get(`/api/game-sessions/${id}`);
  return response.data;
}

/**
 * Fetch all game sessions for a specific campaign
 */
export async function fetchCampaignSessions(campaignId: string): Promise<GameSessionWithId[]> {
  return fetchGameSessions({ campaignId });
}

/**
 * Create a new game session
 */
export async function createGameSession(data: Omit<IGameSession, 'id'>): Promise<IGameSession> {
  const response = await api.post('/api/game-sessions', data);
  return response.data;
}

/**
 * Update a game session status
 */
export async function updateGameSessionStatus(
  id: string,
  status: string
): Promise<GameSessionWithId> {
  const response = await api.patch(`/api/game-sessions/${id}/status`, { status });
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
  data: Partial<IGameSession>
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
