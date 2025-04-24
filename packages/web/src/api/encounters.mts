import type { IEncounter } from '@dungeon-lab/shared/schemas/encounter.schema.mjs';
import api from './axios.mjs';

export async function getEncounters(): Promise<IEncounter[]> {
  const response = await api.get<IEncounter[]>('/api/encounters');
  return response.data;
}

export async function getEncounter(encounterId: string): Promise<IEncounter> {
  const response = await api.get<IEncounter>(`/api/encounters/${encounterId}`);
  return response.data;
}

export async function createEncounter(
  data: Omit<IEncounter, 'id'>,
  campaignId: string
): Promise<IEncounter> {
  const response = await api.post<IEncounter>(`/api/campaigns/${campaignId}/encounters`, data);
  return response.data;
}

export async function updateEncounter(
  encounterId: string,
  data: Partial<IEncounter>
): Promise<IEncounter> {
  const response = await api.patch<IEncounter>(`/api/encounters/${encounterId}`, data);
  return response.data;
}

export async function deleteEncounter(encounterId: string): Promise<void> {
  await api.delete(`/api/encounters/${encounterId}`);
}

export async function getEncountersByCampaign(campaignId: string): Promise<IEncounter[]> {
  const response = await api.get<IEncounter[]>(`/api/campaigns/${campaignId}/encounters`);
  return response.data;
}

export async function updateEncounterStatus(
  encounterId: string,
  status: 'draft' | 'ready' | 'in_progress' | 'completed'
): Promise<IEncounter> {
  const response = await api.patch<IEncounter>(`/api/encounters/${encounterId}/status`, { status });
  return response.data;
}
