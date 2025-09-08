import { ApiClient } from './api.client.mjs';
import type { IMap, IMapUpdateData } from '@dungeon-lab/shared/types/index.mjs';
import { UVTTData } from '@dungeon-lab/shared/schemas/index.mjs';
import {
  BaseAPIResponse,
  DeleteAPIResponse,
  CreateMapRequest,
  IMapResponse,
  ImportUVTTResponse
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
   * @param data Map data without the image
   * @param imageFile Optional image file to upload
   */
  async createMap(data: Omit<CreateMapRequest, 'image'>, imageFile?: File): Promise<IMap> {
    // Upload the image first if provided
    let imageId: string | undefined;
    
    if (imageFile) {
      try {
        // Create form data for the asset upload
        const formData = new FormData();
        formData.append('file', imageFile); // Field MUST be named 'file' for the server
        formData.append('type', 'map');
        formData.append('name', data.name + ' image');
        
        // Upload the asset
        const asset = await this.assetsClient.uploadAsset(formData);
        imageId = asset.id;
      } catch (error) {
        console.error('Failed to upload map image:', error);
        throw new Error('Failed to upload map image: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
    
    // Create the map with imageId reference
    const mapData = {
      ...data,
      ...(imageId ? { imageId } : {})
    };
    
    // Use regular JSON request
    const response = await this.api.post<BaseAPIResponse<IMap>>('/api/maps', mapData);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to create map');
    }
    
    return response.data.data;
  }

  /**
   * Update an existing map
   * @param mapId ID of the map to update
   * @param data Map update data
   * @param imageFile Optional new image file
   */
  async updateMap(mapId: string, data: IMapUpdateData, imageFile?: File): Promise<IMap> {
    // Upload the image first if provided
    let imageId: string | undefined;
    
    if (imageFile) {
      try {
        // Create form data for the asset upload
        const formData = new FormData();
        formData.append('file', imageFile); // Field MUST be named 'file' for the server
        formData.append('type', 'map');
        formData.append('name', (data.name || 'Map') + ' image');
        
        // Upload the asset
        const asset = await this.assetsClient.uploadAsset(formData);
        imageId = asset.id;
      } catch (error) {
        console.error('Failed to upload map image:', error);
        throw new Error('Failed to upload map image: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
    
    // Update the map with imageId reference
    const mapData = {
      ...data,
      ...(imageId ? { imageId } : {})
    };
    
    // Use regular JSON request
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

    // The map is returned with its image ID reference
    const map = response.data.data;
    if (!map.id) {
      throw new Error('Invalid map data returned');
    }
    return map.id;
  }

  /**
   * Export a map as UVTT format
   * @param mapId ID of the map to export
   * @returns UVTT data object with embedded base64 image
   */
  async exportMapAsUVTT(mapId: string): Promise<UVTTData> {
    const response = await this.api.get<BaseAPIResponse<UVTTData>>(`/api/maps/${mapId}/export-uvtt`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to export map as UVTT');
    }
    
    if (!response.data.data) {
      throw new Error('No UVTT data returned from server');
    }
    
    return response.data.data;
  }

  /**
   * Import a map from a UVTT file
   * @param file UVTT file to import
   * @returns Created map
   */
  async importUVTT(file: File): Promise<IMap> {
    const response = await this.api.post<ImportUVTTResponse>('/api/maps/import-uvtt', file, {
      headers: {
        'Content-Type': 'application/uvtt'
      }
    });
    
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || 'Failed to import UVTT file');
    }
    
    if (!response.data.data) {
      throw new Error('No map data returned from UVTT import');
    }
    
    return response.data.data;
  }
}
