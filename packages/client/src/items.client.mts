import type { IItem } from '@dungeon-lab/shared/schemas/item.schema.mjs';
import {
  GetItemsResponse,
  GetItemResponse,
  CreateItemRequest,
  CreateItemResponse,
  PatchItemRequest,
  PatchItemResponse,
  DeleteItemResponse
} from '@dungeon-lab/shared/types/api/index.mjs';
import api from './api.client.mjs';

export async function getItems(): Promise<IItem[]> {
  const response = await api.get<GetItemsResponse>('/api/items');
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get items');
  }
  return response.data.data;
}

export async function getItem(itemId: string): Promise<IItem | undefined> {
  const response = await api.get<GetItemResponse>(`/api/items/${itemId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get item');
  }
  return response.data.data;
}

export async function createItem(data: CreateItemRequest): Promise<IItem | undefined> {
  const response = await api.post<CreateItemResponse>('/api/items', data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create item');
  }
  return response.data.data;
}

export async function updateItem(
  itemId: string,
  data: PatchItemRequest
): Promise<IItem | undefined> {
  const response = await api.patch<PatchItemResponse>(`/api/items/${itemId}`, data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update item');
  }
  return response.data.data;
}

export async function deleteItem(itemId: string): Promise<void> {
  const response = await api.delete<DeleteItemResponse>(`/api/items/${itemId}`);
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to delete item');
  }
}

// Using more generic response type structure until dedicated response types are available
interface GenericItemsResponse {
  success: boolean;
  data: IItem[];
  error?: string;
}

export async function getItemsByCampaign(campaignId: string): Promise<IItem[]> {
  const response = await api.get<GenericItemsResponse>(`/api/campaigns/${campaignId}/items`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get campaign items');
  }
  return response.data.data;
}

export async function getItemsByActor(actorId: string): Promise<IItem[]> {
  const response = await api.get<GenericItemsResponse>(`/api/actors/${actorId}/items`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get actor items');
  }
  return response.data.data;
}
