import api from './axios.mts';
import type { IActor } from '@dungeon-lab/shared/index.mjs';

export async function getActors(): Promise<IActor[]> {
  const response = await api.get('/api/actors');
  return response.data;
}

export async function getActor(actorId: string): Promise<IActor> {
  const response = await api.get(`/api/actors/${actorId}`);
  return response.data;
}

export async function createActor(data: Omit<IActor, 'id'>): Promise<IActor> {
  const response = await api.post('/api/actors', data);
  return response.data;
}

export async function updateActor(actorId: string, data: Partial<IActor>): Promise<IActor> {
  const response = await api.patch(`/api/actors/${actorId}`, data);
  return response.data;
}

export async function deleteActor(actorId: string): Promise<void> {
  await api.delete(`/api/actors/${actorId}`);
}

export async function getActorsByUser(userId: string): Promise<IActor[]> {
  const response = await api.get(`/api/users/${userId}/actors`);
  return response.data;
}

export async function getActorsByCampaign(campaignId: string): Promise<IActor[]> {
  const response = await api.get(`/api/campaigns/${campaignId}/actors`);
  return response.data;
}
