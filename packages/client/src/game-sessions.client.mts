import { ApiClient } from './api.client.mjs';
import type { IGameSession } from '@dungeon-lab/shared/types/index.mjs';
import {
  BaseAPIResponse,
  CreateGameSessionRequest,
  UpdateGameSessionRequest,
  DeleteAPIResponse
} from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Client for interacting with game sessions API
 */
export class GameSessionsClient extends ApiClient {
  /**
   * Fetch a specific game session by ID
   */
  async getGameSession(sessionId: string): Promise<IGameSession> {
    const response = await this.api.get<BaseAPIResponse<IGameSession>>(
      `/api/game-sessions/${sessionId}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get game session');
    }
    if (!response.data.data) {
      throw new Error('Game session not found');
    }
    return response.data.data;
  }

  /**
   * Fetch all game sessions with optional filters
   */
  async getGameSessions(campaignId?: string, status?: string): Promise<IGameSession[]> {
    const params: Record<string, string> = {};
    if (campaignId) params.campaignId = campaignId;
    if (status) params.status = status;

    const response = await this.api.get<BaseAPIResponse<IGameSession[]>>('/api/game-sessions', {
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
  async getCampaignSessions(campaignId: string): Promise<IGameSession[]> {
    const response = await this.api.get<BaseAPIResponse<IGameSession[]>>('/api/game-sessions', {
      params: { campaignId }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get campaign sessions');
    }
    return response.data.data;
  }

  /**
   * Create a new game session
   */
  async createGameSession(data: CreateGameSessionRequest): Promise<IGameSession> {
    const response = await this.api.post<BaseAPIResponse<IGameSession>>('/api/game-sessions', data);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create game session');
    }
    if (!response.data.data) {
      throw new Error('Failed to create game session');
    }
    return response.data.data;
  }

  /**
   * Update a game session
   */
  async updateGameSession(
    sessionId: string,
    data: UpdateGameSessionRequest
  ): Promise<IGameSession> {
    const response = await this.api.patch<BaseAPIResponse<IGameSession>>(
      `/api/game-sessions/${sessionId}`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update game session');
    }
    if (!response.data.data) {
      throw new Error('Game session not found');
    }
    return response.data.data;
  }

  /**
   * Start a scheduled game session
   */
  async startGameSession(sessionId: string): Promise<IGameSession> {
    const response = await this.api.post<BaseAPIResponse<IGameSession>>(
      `/api/game-sessions/${sessionId}/start`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start game session');
    }
    if (!response.data.data) {
      throw new Error('Game session not found');
    }
    return response.data.data;
  }

  /**
   * Pause an active game session
   */
  async pauseGameSession(sessionId: string): Promise<IGameSession> {
    const response = await this.api.post<BaseAPIResponse<IGameSession>>(
      `/api/game-sessions/${sessionId}/pause`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to pause game session');
    }
    if (!response.data.data) {
      throw new Error('Game session not found');
    }
    return response.data.data;
  }

  /**
   * Resume a paused game session
   */
  async resumeGameSession(sessionId: string): Promise<IGameSession> {
    const response = await this.api.post<BaseAPIResponse<IGameSession>>(
      `/api/game-sessions/${sessionId}/resume`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to resume game session');
    }
    if (!response.data.data) {
      throw new Error('Game session not found');
    }
    return response.data.data;
  }

  /**
   * Delete a game session
   */
  async deleteGameSession(sessionId: string): Promise<void> {
    const response = await this.api.delete<DeleteAPIResponse>(`/api/game-sessions/${sessionId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete game session');
    }
  }


  /**
   * End a game session
   */
  async endGameSession(sessionId: string): Promise<IGameSession> {
    const response = await this.api.post<BaseAPIResponse<IGameSession>>(
      `/api/game-sessions/${sessionId}/end`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to end game session');
    }
    if (!response.data.data) {
      throw new Error('Game session not found');
    }
    return response.data.data;
  }

  /**
   * Join a game session
   */
  async joinGameSession(sessionId: string): Promise<void> {
    const response = await this.api.post<BaseAPIResponse<void>>(
      `/api/game-sessions/${sessionId}/join`
    );

    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to join game session');
    }
  }

  /**
   * Leave a game session
   */
  async leaveGameSession(sessionId: string): Promise<void> {
    const response = await this.api.post<BaseAPIResponse<void>>(
      `/api/game-sessions/${sessionId}/leave`
    );

    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to leave game session');
    }
  }
}
