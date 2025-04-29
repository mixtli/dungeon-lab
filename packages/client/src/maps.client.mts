import type { IMap } from '@dungeon-lab/shared/schemas/map.schema.mjs';
import {
  CreateMapRequest,
  PatchMapRequest,
  GetMapResponse,
  GetMapsResponse,
  CreateMapResponse,
  PatchMapResponse,
  UploadMapImageResponse
} from '@dungeon-lab/shared/types/api/index.mjs';
import api from './api.client.mjs';

export async function getMap(mapId: string): Promise<IMap | undefined> {
  const response = await api.get<GetMapResponse>(`/api/maps/${mapId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get map');
  }
  return response.data.data;
}

export async function getMaps(): Promise<IMap[]> {
  const response = await api.get<GetMapsResponse>('/api/maps');
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get maps');
  }
  return response.data.data;
}

export async function createMap(data: CreateMapRequest): Promise<IMap | undefined> {
  const response = await api.post<CreateMapResponse>('/api/maps', data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create map');
  }
  return response.data.data;
}

export async function updateMap(mapId: string, data: PatchMapRequest): Promise<IMap | undefined> {
  const response = await api.patch<PatchMapResponse>(`/api/maps/${mapId}`, data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update map');
  }
  return response.data.data;
}

export async function deleteMap(mapId: string): Promise<void> {
  const response = await api.delete(`/api/maps/${mapId}`);
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to delete map');
  }
}

export async function uploadMapImage(mapId: string, file: File): Promise<string | undefined> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post<UploadMapImageResponse>(`/api/maps/${mapId}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to upload map image');
  }

  // The map is returned with its image ID reference
  const map = response.data.data;
  // Just return a success indication since we don't get direct URL access
  return map?.id;
}
