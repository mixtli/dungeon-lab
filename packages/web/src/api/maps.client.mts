import type { IMap } from '@dungeon-lab/shared/schemas/map.schema.mjs';
import api from './axios.mts';

export async function getMap(mapId: string): Promise<IMap> {
  const response = await api.get<IMap>(`/api/maps/${mapId}`);
  return response.data;
}

export async function getMaps(): Promise<IMap[]> {
  const response = await api.get<IMap[]>('/api/maps');
  return response.data;
}

export async function createMap(data: Omit<IMap, 'id'>): Promise<IMap> {
  const response = await api.post<IMap>('/api/maps', data);
  return response.data;
}

export async function updateMap(mapId: string, data: Partial<IMap>): Promise<IMap> {
  const response = await api.patch<IMap>(`/api/maps/${mapId}`, data);
  return response.data;
}

export async function deleteMap(mapId: string): Promise<void> {
  await api.delete(`/api/maps/${mapId}`);
}

export async function getMapsByCampaign(campaignId: string): Promise<IMap[]> {
  const response = await api.get<IMap[]>(`/api/campaigns/${campaignId}/maps`);
  return response.data;
}

export async function uploadMapImage(mapId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post(`/api/maps/${mapId}/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data.imageUrl;
}
