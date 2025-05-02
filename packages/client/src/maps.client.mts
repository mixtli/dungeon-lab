import { ApiClient } from './api.client.mjs';
import type { IMap } from '@dungeon-lab/shared/types/index.mjs';
import {
  BaseAPIResponse,
  DeleteAPIResponse,
  CreateMapRequest,
  PatchMapRequest,
  IMapResponse
} from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Client for interacting with maps API
 */
export class MapsClient extends ApiClient {
  /**
   * Fetch a specific map by ID
   */
  async getMap(mapId: string): Promise<IMapResponse> {
    const response = await this.api.get<BaseAPIResponse<IMapResponse>>(`/api/maps/${mapId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get map');
    }
    if (!response.data.data) {
      throw new Error('Map not found');
    }
    return response.data.data;
  }

  /**
   * Fetch all maps
   */
  async getMaps(): Promise<IMapResponse[]> {
    const response = await this.api.get<BaseAPIResponse<IMapResponse[]>>('/api/maps');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get maps');
    }
    return response.data.data;
  }

  /**
   * Create a new map
   */
  async createMap(data: CreateMapRequest): Promise<IMap> {
    const response = await this.api.post<BaseAPIResponse<IMap>>('/api/maps', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create map');
    }
    if (!response.data.data) {
      throw new Error('Failed to create map');
    }
    return response.data.data;
  }

  /**
   * Update an existing map
   */
  async updateMap(mapId: string, data: PatchMapRequest): Promise<IMap> {
    const response = await this.api.patch<BaseAPIResponse<IMap>>(`/api/maps/${mapId}`, data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update map');
    }
    if (!response.data.data) {
      throw new Error('Map not found');
    }
    return response.data.data;
  }

  /**
   * Delete a map
   */
  async deleteMap(mapId: string): Promise<void> {
    const response = await this.api.delete<DeleteAPIResponse>(`/api/maps/${mapId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete map');
    }
  }

  /**
   * Upload an image for a map
   */
  async uploadMapImage(mapId: string, file: File): Promise<string> {
    const response = await this.api.put<BaseAPIResponse<IMap>>(`/api/maps/${mapId}/image`, file, {
      headers: {
        'Content-Type': file.type
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload map image');
    }
    if (!response.data.data) {
      throw new Error('Failed to upload map image');
    }

    // The map is returned with its image ID reference
    const map = response.data.data;
    if (!map.id) {
      throw new Error('Invalid map data returned');
    }
    return map.id;
  }
}
