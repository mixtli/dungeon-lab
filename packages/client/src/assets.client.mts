import type { IAsset } from '@dungeon-lab/shared/schemas/asset.schema.mjs';
import api from './api.client.mjs';

/**
 * Get an asset by ID
 */
export async function getAsset(assetId: string): Promise<IAsset | undefined> {
  const response = await api.get<{ data: IAsset }>(`/api/assets/${assetId}`);
  if (!response.data) {
    throw new Error('Failed to get asset');
  }
  return response.data.data || response.data; // Handle legacy responses
}

/**
 * Get all assets with optional filtering
 */
export async function getAssets(
  params?: Record<string, string | number | boolean>
): Promise<IAsset[]> {
  const response = await api.get<{ data: IAsset[] }>('/api/assets', { params });
  if (!response.data) {
    throw new Error('Failed to get assets');
  }
  return response.data.data || response.data; // Handle legacy responses
}

/**
 * Delete an asset
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const response = await api.delete(`/api/assets/${assetId}`);
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to delete asset');
  }
}

/**
 * Upload a new asset
 */
export async function uploadAsset(data: FormData): Promise<IAsset | undefined> {
  const response = await api.post<{ data: IAsset }>('/api/assets', data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  if (!response.data) {
    throw new Error('Failed to upload asset');
  }
  return response.data.data || response.data; // Handle legacy responses
}

/**
 * Update an asset
 */
export async function updateAsset(
  assetId: string,
  data: Partial<IAsset>
): Promise<IAsset | undefined> {
  const response = await api.patch<{ data: IAsset }>(`/api/assets/${assetId}`, data);
  if (!response.data) {
    throw new Error('Failed to update asset');
  }
  return response.data.data || response.data; // Handle legacy responses
}
