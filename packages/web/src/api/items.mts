import type { IItem } from '@dungeon-lab/shared/index.mjs';
import api from './axios.mjs';

export async function getItems(): Promise<IItem[]> {
  const response = await api.get<IItem[]>('/api/items');
  return response.data;
}

export async function getItem(itemId: string): Promise<IItem> {
  const response = await api.get<IItem>(`/api/items/${itemId}`);
  return response.data;
}

export async function createItem(data: Omit<IItem, 'id'>): Promise<IItem> {
  const response = await api.post<IItem>('/api/items', data);
  return response.data;
}

export async function updateItem(itemId: string, data: Partial<IItem>): Promise<IItem> {
  const response = await api.patch<IItem>(`/api/items/${itemId}`, data);
  return response.data;
}

export async function deleteItem(itemId: string): Promise<void> {
  await api.delete(`/api/items/${itemId}`);
}

export async function getItemsByCampaign(campaignId: string): Promise<IItem[]> {
  const response = await api.get<IItem[]>(`/api/campaigns/${campaignId}/items`);
  return response.data;
}

export async function getItemsByActor(actorId: string): Promise<IItem[]> {
  const response = await api.get<IItem[]>(`/api/actors/${actorId}/items`);
  return response.data;
}
