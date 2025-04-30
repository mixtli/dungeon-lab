import type { IItem } from '@dungeon-lab/shared/types/index.mjs';
import {
  BaseAPIResponse,
  CreateItemRequest,
  PatchItemRequest,
  SearchItemsQuery
} from '@dungeon-lab/shared/types/api/index.mjs';
import { ApiClient } from './api.client.mjs';

/**
 * Client for interacting with the items API
 */
export class ItemsClient extends ApiClient {
  /**
   * Get items with optional filtering
   * @param query Optional filter parameters
   */
  async getItems(query?: SearchItemsQuery): Promise<IItem[]> {
    const response = await this.api.get<BaseAPIResponse<IItem[]>>('/api/items', {
      params: query
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get items');
    }
    return response.data.data;
  }

  /**
   * Get a specific item by ID
   */
  async getItem(itemId: string): Promise<IItem | undefined> {
    const response = await this.api.get<BaseAPIResponse<IItem>>(`/api/items/${itemId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get item');
    }
    return response.data.data;
  }

  /**
   * Create a new item
   */
  async createItem(data: CreateItemRequest): Promise<IItem | undefined> {
    const response = await this.api.post<BaseAPIResponse<IItem>>('/api/items', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create item');
    }
    return response.data.data;
  }

  /**
   * Update an existing item
   */
  async updateItem(itemId: string, data: PatchItemRequest): Promise<IItem | undefined> {
    const response = await this.api.patch<BaseAPIResponse<IItem>>(`/api/items/${itemId}`, data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update item');
    }
    return response.data.data;
  }

  /**
   * Delete an item
   */
  async deleteItem(itemId: string): Promise<void> {
    const response = await this.api.delete<BaseAPIResponse<void>>(`/api/items/${itemId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete item');
    }
  }

  /**
   * Get all items for a specific campaign
   */
  async getItemsByCampaign(campaignId: string): Promise<IItem[]> {
    const response = await this.api.get<BaseAPIResponse<IItem[]>>(
      `/api/campaigns/${campaignId}/items`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get campaign items');
    }
    return response.data.data;
  }

  /**
   * Get all items for a specific actor
   */
  async getItemsByActor(actorId: string): Promise<IItem[]> {
    const response = await this.api.get<BaseAPIResponse<IItem[]>>(`/api/actors/${actorId}/items`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get actor items');
    }
    return response.data.data;
  }

  /**
   * Upload an image for an item
   */
  async uploadItemImage(itemId: string, file: File): Promise<string> {
    const response = await this.api.put<BaseAPIResponse<IItem>>(
      `/api/items/${itemId}/image`,
      file,
      {
        headers: {
          'Content-Type': file.type
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload item image');
    }
    if (!response.data.data) {
      throw new Error('Failed to upload item image');
    }

    // The item is returned with its image ID reference
    const item = response.data.data;
    if (!item.id) {
      throw new Error('Invalid item data returned');
    }
    return item.id;
  }
}
