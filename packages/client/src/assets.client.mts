import type { IAsset } from '@dungeon-lab/shared/types/index.mjs';
import { ApiClient } from './api.client.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Client for interacting with the assets API
 */
export class AssetsClient extends ApiClient {
  /**
   * Get an asset by ID
   */
  async getAsset(assetId: string): Promise<IAsset> {
    const response = await this.api.get<BaseAPIResponse<IAsset>>(`/api/assets/${assetId}`);
    if (!response.data) {
      throw new Error('Failed to get asset');
    }
    return response.data.data;
  }

  /**
   * Get all assets with optional filtering
   */
  async getAssets(params?: Record<string, string | number | boolean>): Promise<IAsset[]> {
    const response = await this.api.get<BaseAPIResponse<IAsset[]>>('/api/assets', { params });
    if (!response.data) {
      throw new Error('Failed to get assets');
    }
    return response.data.data;
  }

  /**
   * Delete an asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    const response = await this.api.delete<BaseAPIResponse<void>>(`/api/assets/${assetId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete asset');
    }
  }

  /**
   * Upload a new asset
   */
  async uploadAsset(data: FormData): Promise<IAsset> {
    // Make sure the file field is named 'file', not anything else
    // This is crucial as the server expects the file in this field
    if (data.has('file')) {
      // Ensure we have proper field naming
      const response = await this.api.post<BaseAPIResponse<IAsset>>('/api/assets', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || 'Failed to upload asset');
      }
      
      return response.data.data;
    } else {
      throw new Error('Form data must include a file field');
    }
  }

  /**
   * Update an asset
   */
  async updateAsset(assetId: string, data: Partial<IAsset>): Promise<IAsset> {
    const response = await this.api.patch<BaseAPIResponse<IAsset>>(`/api/assets/${assetId}`, data);
    if (!response.data) {
      throw new Error('Failed to update asset');
    }
    return response.data.data;
  }
}
