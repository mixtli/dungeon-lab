import type { IActor } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import {
  CreateActorRequest,
  PatchActorRequest,
  BaseAPIResponse,
  DeleteAPIResponse,
  SearchActorsQuery
} from '@dungeon-lab/shared/types/api/index.mjs';
import { ApiClient } from './api.client.mjs';

/**
 * Client for interacting with the actors API
 */
export class ActorsClient extends ApiClient {
  /**
   * Get an actor by ID
   */
  async getActor(actorId: string): Promise<IActor | undefined> {
    const response = await this.api.get<BaseAPIResponse<IActor>>(`/api/actors/${actorId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get actor');
    }
    return response.data.data;
  }

  private toFormData(data: PatchActorRequest): FormData {
    const formData = new FormData();

    // Add all standard fields to the form data
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'data' || key === 'userData') {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null && key !== 'avatar' && key !== 'token') {
        formData.append(key, value.toString());
      }
    });

    // Add avatar and token files if present
    if (data.avatar instanceof File) {
      formData.append('avatar', data.avatar);
    }

    if (data.token instanceof File) {
      formData.append('token', data.token);
    }
    return formData;
  }

  /**
   * Create a new actor
   */
  async createActor(data: CreateActorRequest): Promise<IActor | undefined> {
    const formData = this.toFormData(data);
    const response = await this.api.post<BaseAPIResponse<IActor>>('/api/actors', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create actor');
    }
    return response.data.data;
  }

  /**
   * Update an actor
   */
  async updateActor(actorId: string, data: PatchActorRequest): Promise<IActor | undefined> {
    const formData = this.toFormData(data);
    const response = await this.api.patch<BaseAPIResponse<IActor>>(
      `/api/actors/${actorId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update actor');
    }
    return response.data.data;
  }

  /**
   * Get actors with optional filtering
   * @param query Optional filter parameters
   */
  async getActors(query?: SearchActorsQuery): Promise<IActor[]> {
    const response = await this.api.get<BaseAPIResponse<IActor[]>>('/api/actors', {
      params: query
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get actors');
    }
    return response.data.data;
  }

  /**
   * Get actors for a specific campaign
   */
  async getActorsByCampaign(campaignId: string): Promise<IActor[]> {
    const response = await this.api.get<BaseAPIResponse<IActor[]>>(
      `/api/actors/campaign/${campaignId}`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get campaign actors');
    }
    return response.data.data;
  }

  /**
   * Update an actor (entirely replace)
   */
  async putActor(actorId: string, data: CreateActorRequest): Promise<IActor | undefined> {
    const formData = new FormData();

    // Add all standard fields to the form data
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'data' || key === 'userData') {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null && key !== 'avatar' && key !== 'token') {
        formData.append(key, value.toString());
      }
    });

    // Add avatar and token files if present
    if (data.avatar instanceof File) {
      formData.append('avatar', data.avatar);
    }

    if (data.token instanceof File) {
      formData.append('token', data.token);
    }

    const response = await this.api.put<BaseAPIResponse<IActor>>(
      `/api/actors/${actorId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update actor');
    }

    return response.data.data;
  }

  /**
   * Partially update an actor
   */
  async patchActor(actorId: string, data: PatchActorRequest): Promise<IActor | undefined> {
    const formData = new FormData();

    // Add fields to the form data
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'data' || key === 'userData') {
        if (value) {
          formData.append(key, JSON.stringify(value));
        }
      } else if (value !== undefined && value !== null && key !== 'avatar' && key !== 'token') {
        formData.append(key, value.toString());
      }
    });

    // Add avatar and token files if present
    if (data.avatar instanceof File) {
      formData.append('avatar', data.avatar);
    }

    if (data.token instanceof File) {
      formData.append('token', data.token);
    }

    const response = await this.api.patch<BaseAPIResponse<IActor>>(
      `/api/actors/${actorId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to patch actor');
    }

    return response.data.data;
  }

  /**
   * Delete an actor
   */
  async deleteActor(actorId: string): Promise<void> {
    const response = await this.api.delete<DeleteAPIResponse>(`/api/actors/${actorId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete actor');
    }
  }

  /**
   * Upload an actor's avatar
   */
  async uploadActorAvatar(actorId: string, file: File): Promise<IActor | undefined> {
    const response = await this.api.put<BaseAPIResponse<IActor>>(
      `/api/actors/${actorId}/avatar`,
      file,
      {
        headers: {
          'Content-Type': file.type
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload actor avatar');
    }

    return response.data.data;
  }

  /**
   * Upload an actor's token
   */
  async uploadActorToken(actorId: string, file: File): Promise<IActor | undefined> {
    const response = await this.api.put<BaseAPIResponse<IActor>>(
      `/api/actors/${actorId}/token`,
      file,
      {
        headers: {
          'Content-Type': file.type
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload actor token');
    }

    return response.data.data;
  }

  /**
   * Generate an actor's avatar using AI
   */
  async generateActorAvatar(actorId: string): Promise<IActor | undefined> {
    const response = await this.api.post<BaseAPIResponse<IActor>>(
      `/api/actors/${actorId}/generate-avatar`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate actor avatar');
    }

    return response.data.data;
  }

  /**
   * Generate an actor's token using AI
   */
  async generateActorToken(actorId: string): Promise<IActor | undefined> {
    const response = await this.api.post<BaseAPIResponse<IActor>>(
      `/api/actors/${actorId}/generate-token`
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate actor token');
    }

    return response.data.data;
  }

  /**
   * Search for actors based on given parameters
   */
  async searchActors(params: Record<string, string>): Promise<IActor[]> {
    const response = await this.api.get<BaseAPIResponse<IActor[]>>('/api/actors/search', {
      params
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to search actors');
    }

    return response.data.data;
  }
}
