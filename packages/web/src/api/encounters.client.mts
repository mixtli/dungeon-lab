import type { IEncounter } from '@dungeon-lab/shared/schemas/encounter.schema.mjs';
import api from './axios.mts';

// Generic response types for endpoints without specific type definitions
interface GenericResponse {
  success: boolean;
  error?: string;
}

interface GenericDataResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Specific response types
type GetEncountersResponse = GenericDataResponse<IEncounter[]>;
type GetEncounterResponse = GenericDataResponse<IEncounter>;
type CreateEncounterResponse = GenericDataResponse<IEncounter>;
type PatchEncounterResponse = GenericDataResponse<IEncounter>;
type DeleteEncounterResponse = GenericResponse;

// Request types
type CreateEncounterRequest = Omit<IEncounter, 'id'>;
type PatchEncounterRequest = Partial<IEncounter>;

export async function getEncounters(): Promise<IEncounter[]> {
  const response = await api.get<GetEncountersResponse>('/api/encounters');
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get encounters');
  }
  return response.data.data;
}

export async function getEncounter(encounterId: string, campaignId: string): Promise<IEncounter> {
  const response = await api.get<GetEncounterResponse>(
    `/api/campaigns/${campaignId}/encounters/${encounterId}`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get encounter');
  }
  if (!response.data.data) {
    throw new Error('Encounter not found');
  }
  return response.data.data;
}

export async function createEncounter(
  data: CreateEncounterRequest,
  campaignId: string
): Promise<IEncounter> {
  const response = await api.post<CreateEncounterResponse>(
    `/api/campaigns/${campaignId}/encounters`,
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create encounter');
  }
  if (!response.data.data) {
    throw new Error('Failed to create encounter');
  }
  return response.data.data;
}

export async function updateEncounter(
  encounterId: string,
  campaignId: string,
  data: PatchEncounterRequest
): Promise<IEncounter> {
  const response = await api.patch<PatchEncounterResponse>(
    `/api/campaigns/${campaignId}/encounters/${encounterId}`,
    data
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update encounter');
  }
  if (!response.data.data) {
    throw new Error('Encounter not found');
  }
  return response.data.data;
}

export async function deleteEncounter(encounterId: string, campaignId: string): Promise<void> {
  const response = await api.delete<DeleteEncounterResponse>(
    `/api/campaigns/${campaignId}/encounters/${encounterId}`
  );
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to delete encounter');
  }
}

export async function getEncountersByCampaign(campaignId: string): Promise<IEncounter[]> {
  const response = await api.get<GetEncountersResponse>(`/api/campaigns/${campaignId}/encounters`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get campaign encounters');
  }
  return response.data.data;
}

export async function updateEncounterStatus(
  encounterId: string,
  campaignId: string,
  status: 'draft' | 'ready' | 'in_progress' | 'completed'
): Promise<IEncounter> {
  const response = await api.patch<PatchEncounterResponse>(
    `/api/campaigns/${campaignId}/encounters/${encounterId}/status`,
    { status }
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update encounter status');
  }
  if (!response.data.data) {
    throw new Error('Encounter not found');
  }
  return response.data.data;
}
