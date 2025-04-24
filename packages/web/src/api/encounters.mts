import api from './axios.mjs';
import type { IEncounter } from '@dungeon-lab/shared/index.mjs';

export async function getEncounter(encounterId: string, campaignId: string): Promise<IEncounter> {
  const response = await api.get(`/api/campaigns/${campaignId}/encounters/${encounterId}`);
  return response.data;
}

export async function createEncounter(
  data: Omit<IEncounter, 'campaignId'>,
  campaignId: string
): Promise<IEncounter> {
  const response = await api.post(`/api/campaigns/${campaignId}/encounters`, data);
  return response.data;
}

export async function updateEncounter(
  encounterId: string,
  campaignId: string,
  data: Partial<IEncounter>
): Promise<IEncounter> {
  const response = await api.patch(`/api/campaigns/${campaignId}/encounters/${encounterId}`, data);
  return response.data;
}

export async function deleteEncounter(encounterId: string, campaignId: string): Promise<void> {
  await api.delete(`/api/campaigns/${campaignId}/encounters/${encounterId}`);
}

export async function updateEncounterStatus(
  encounterId: string,
  campaignId: string,
  status: 'draft' | 'ready' | 'in_progress' | 'completed'
): Promise<IEncounter> {
  return updateEncounter(encounterId, campaignId, { status });
}
