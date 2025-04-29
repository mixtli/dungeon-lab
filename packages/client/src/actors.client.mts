import type { IActor } from '@dungeon-lab/shared/schemas/actor.schema.mjs';
import {
  CreateActorRequest,
  PatchActorRequest,
  GetActorResponse,
  GetActorsResponse,
  CreateActorResponse,
  PatchActorResponse,
  PutActorResponse,
  UploadActorAvatarResponse,
  UploadActorTokenResponse,
  GetActorsByCampaignResponse,
  SearchActorsResponse
} from '@dungeon-lab/shared/types/api/index.mjs';
import api from './api.client.mjs';

/**
 * Get an actor by ID
 */
export async function getActor(actorId: string): Promise<IActor | undefined> {
  const response = await api.get<GetActorResponse>(`/api/actors/${actorId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get actor');
  }
  return response.data.data;
}

export async function updateActor(
  actorId: string,
  data: PatchActorRequest
): Promise<IActor | undefined> {
  const response = await api.patch<PatchActorResponse>(`/api/actors/${actorId}`, data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update actor');
  }
  return response.data.data;
}

/**
 * Get all actors
 */
export async function getActors(): Promise<IActor[]> {
  const response = await api.get<GetActorsResponse>('/api/actors');
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get actors');
  }
  return response.data.data;
}

/**
 * Get actors for a specific campaign
 */
export async function getActorsByCampaign(campaignId: string): Promise<IActor[]> {
  const response = await api.get<GetActorsByCampaignResponse>(`/api/actors/campaign/${campaignId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get campaign actors');
  }
  return response.data.data;
}

/**
 * Create a new actor
 */
export async function createActor(data: CreateActorRequest): Promise<IActor | undefined> {
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

  const response = await api.post<CreateActorResponse>('/api/actors', formData, {
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
 * Update an actor (entirely replace)
 */
export async function putActor(
  actorId: string,
  data: CreateActorRequest
): Promise<IActor | undefined> {
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

  const response = await api.put<PutActorResponse>(`/api/actors/${actorId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update actor');
  }

  return response.data.data;
}

/**
 * Partially update an actor
 */
export async function patchActor(
  actorId: string,
  data: PatchActorRequest
): Promise<IActor | undefined> {
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

  const response = await api.patch<PatchActorResponse>(`/api/actors/${actorId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to patch actor');
  }

  return response.data.data;
}

/**
 * Delete an actor
 */
export async function deleteActor(actorId: string): Promise<void> {
  const response = await api.delete(`/api/actors/${actorId}`);
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to delete actor');
  }
}

/**
 * Upload an actor's avatar
 */
export async function uploadActorAvatar(actorId: string, file: File): Promise<IActor | undefined> {
  const response = await api.put<UploadActorAvatarResponse>(`/api/actors/${actorId}/avatar`, file, {
    headers: {
      'Content-Type': file.type
    }
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to upload actor avatar');
  }

  return response.data.data;
}

/**
 * Upload an actor's token
 */
export async function uploadActorToken(actorId: string, file: File): Promise<IActor | undefined> {
  const response = await api.put<UploadActorTokenResponse>(`/api/actors/${actorId}/token`, file, {
    headers: {
      'Content-Type': file.type
    }
  });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to upload actor token');
  }

  return response.data.data;
}

/**
 * Generate an actor's avatar using AI
 */
export async function generateActorAvatar(actorId: string): Promise<IActor | undefined> {
  const response = await api.post<UploadActorAvatarResponse>(
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
export async function generateActorToken(actorId: string): Promise<IActor | undefined> {
  const response = await api.post<UploadActorTokenResponse>(
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
export async function searchActors(params: Record<string, string>): Promise<IActor[]> {
  const response = await api.get<SearchActorsResponse>('/api/actors/search', { params });

  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to search actors');
  }

  return response.data.data;
}
