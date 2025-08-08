import { ApiClient } from './api.client.mjs';
import type { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import { BaseAPIResponse, DeleteAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Client for interacting with encounters API
 */
export class EncountersClient extends ApiClient {
  /**
   * Fetch all encounters
   */
  async getEncounters(): Promise<IEncounter[]> {
    const response = await this.api.get<BaseAPIResponse<IEncounter[]>>('/api/encounters');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get encounters');
    }
    return response.data.data;
  }

  /**
   * Fetch a specific encounter by ID
   */
  async getEncounter(encounterId: string): Promise<IEncounter> {
    const response = await this.api.get<BaseAPIResponse<IEncounter>>(
      `/api/encounters/${encounterId}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get encounter');
    }
    if (!response.data.data) {
      throw new Error('Encounter not found');
    }
    return response.data.data;
  }

  /**
   * Create a new encounter
   */
  async createEncounter(data: Omit<IEncounter, 'id'>): Promise<IEncounter> {
    const response = await this.api.post<BaseAPIResponse<IEncounter>>('/api/encounters', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create encounter');
    }
    if (!response.data.data) {
      throw new Error('Failed to create encounter');
    }
    return response.data.data;
  }

  /**
   * Update an encounter
   */
  async updateEncounter(encounterId: string, data: Partial<IEncounter>): Promise<IEncounter> {
    const response = await this.api.patch<BaseAPIResponse<IEncounter>>(
      `/api/encounters/${encounterId}`,
      data
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update encounter');
    }
    if (!response.data.data) {
      throw new Error('Encounter not found');
    }
    return response.data.data;
  }

  /**
   * Delete an encounter
   */
  async deleteEncounter(encounterId: string): Promise<void> {
    const response = await this.api.delete<DeleteAPIResponse>(`/api/encounters/${encounterId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete encounter');
    }
  }

  /**
   * Fetch all encounters for a specific campaign
   */
  async getEncountersByCampaign(campaignId: string): Promise<IEncounter[]> {
    const response = await this.api.get<BaseAPIResponse<IEncounter[]>>(`/api/encounters/`, {
      params: { campaignId }
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get encounter');
    }
    return response.data.data;
  }

  /**
   * Update an encounter's status
   */
  async updateEncounterStatus(
    encounterId: string,
    status: 'draft' | 'ready' | 'in_progress' | 'completed' | 'stopped'
  ): Promise<IEncounter> {
    const response = await this.api.patch<BaseAPIResponse<IEncounter>>(
      `/api/encounters/${encounterId}/status`,
      { status }
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update encounter status');
    }
    if (!response.data.data) {
      throw new Error('Encounter not found');
    }
    return response.data.data;
  }

  // NOTE: Token operations moved to game state system
}
