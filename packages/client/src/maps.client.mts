import { ApiClient } from './api.client.mjs';
import type { IMap, IMapUpdateData } from '@dungeon-lab/shared/types/index.mjs';
import {
  BaseAPIResponse,
  DeleteAPIResponse,
  CreateMapRequest,
  IMapResponse,
} from '@dungeon-lab/shared/types/api/index.mjs';
import { AssetsClient } from './assets.client.mjs';

/**
 * Client for interacting with maps API
 */
export class MapsClient extends ApiClient {
  private assetsClient: AssetsClient;

  constructor(params = {}) {
    super(params);
    this.assetsClient = new AssetsClient(params);
  }

  /**
   * Fetch a specific map by ID
   */
  async getMap(mapId: string): Promise<IMapResponse> {
    const response = await this.api.get<BaseAPIResponse<IMapResponse>>(`/api/maps/${mapId}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
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
  async createMap(data: Omit<CreateMapRequest, 'image'>, imageFile?: File): Promise<IMap> {
    let imageId: string | undefined;

    if (imageFile) {
      try {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('type', 'map');
        formData.append('name', data.name + ' image');

        const asset = await this.assetsClient.uploadAsset(formData);
        imageId = asset.id;
      } catch (error) {
        console.error('Failed to upload map image:', error);
        throw new Error('Failed to upload map image: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    const mapData = {
      ...data,
      ...(imageId ? { imageId } : {})
    };

    const response = await this.api.post<BaseAPIResponse<IMap>>('/api/maps', mapData);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to create map');
    }

    return response.data.data;
  }

  /**
   * Update an existing map
   */
  async updateMap(mapId: string, data: IMapUpdateData, imageFile?: File): Promise<IMap> {
    let imageId: string | undefined;

    if (imageFile) {
      try {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('type', 'map');
        formData.append('name', (data.name || 'Map') + ' image');

        const asset = await this.assetsClient.uploadAsset(formData);
        imageId = asset.id;
      } catch (error) {
        console.error('Failed to upload map image:', error);
        throw new Error('Failed to upload map image: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    const mapData = {
      ...data,
      ...(imageId ? { imageId } : {})
    };

    const response = await this.api.put<BaseAPIResponse<IMap>>(`/api/maps/${mapId}`, mapData);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to update map');
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

    const map = response.data.data;
    if (!map.id) {
      throw new Error('Invalid map data returned');
    }
    return map.id;
  }
}
