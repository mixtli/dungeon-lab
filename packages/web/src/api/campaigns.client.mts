import api from './axios.mts';
import type { ICampaign } from '@dungeon-lab/shared/schemas/campaign.schema.mjs';
import {
  GetCampaignsResponse,
  GetCampaignResponse,
  CreateCampaignRequest,
  CreateCampaignResponse,
  PatchCampaignRequest,
  PatchCampaignResponse
} from '@dungeon-lab/shared/types/api/index.mjs';

export async function getCampaigns(): Promise<ICampaign[]> {
  const response = await api.get<GetCampaignsResponse>('/api/campaigns');
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get campaigns');
  }
  return response.data.data;
}

export async function getCampaign(campaignId: string): Promise<ICampaign> {
  const response = await api.get<GetCampaignResponse>(`/api/campaigns/${campaignId}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get campaign');
  }
  if (!response.data.data) {
    throw new Error('Campaign not found');
  }
  return response.data.data;
}

export async function createCampaign(data: CreateCampaignRequest): Promise<ICampaign> {
  const response = await api.post<CreateCampaignResponse>('/api/campaigns', data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create campaign');
  }
  if (!response.data.data) {
    throw new Error('Failed to create campaign');
  }
  return response.data.data;
}

export async function updateCampaign(
  campaignId: string,
  data: PatchCampaignRequest
): Promise<ICampaign> {
  const response = await api.patch<PatchCampaignResponse>(`/api/campaigns/${campaignId}`, data);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to update campaign');
  }
  if (!response.data.data) {
    throw new Error('Campaign not found');
  }
  return response.data.data;
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const response = await api.delete(`/api/campaigns/${campaignId}`);
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to delete campaign');
  }
}

// Generic success/error response
interface GenericResponse {
  success: boolean;
  error?: string;
}

// Generic success/error response with data
interface GenericDataResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export async function sendInvite(inviteData: {
  campaignId: string;
  email: string;
  permission: string;
}): Promise<boolean> {
  const response = await api.post<GenericResponse>(
    `/api/campaigns/${inviteData.campaignId}/invites`,
    inviteData
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to send invite');
  }
  return true;
}

export async function getCampaignsByUser(userId: string): Promise<ICampaign[]> {
  const response = await api.get<GenericDataResponse<ICampaign[]>>(
    `/api/users/${userId}/campaigns`
  );
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to get user campaigns');
  }
  return response.data.data;
}

export async function joinCampaign(campaignId: string, inviteCode: string): Promise<ICampaign> {
  const response = await api.post<GetCampaignResponse>(`/api/campaigns/${campaignId}/join`, {
    inviteCode
  });
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to join campaign');
  }
  if (!response.data.data) {
    throw new Error('Failed to join campaign');
  }
  return response.data.data;
}

export async function leaveCampaign(campaignId: string): Promise<void> {
  const response = await api.post<GenericResponse>(`/api/campaigns/${campaignId}/leave`);
  if (response.data && !response.data.success) {
    throw new Error(response.data.error || 'Failed to leave campaign');
  }
}

interface InviteCodeResponse {
  success: boolean;
  inviteCode: string;
  error?: string;
}

export async function generateInviteCode(campaignId: string): Promise<string> {
  const response = await api.post<InviteCodeResponse>(`/api/campaigns/${campaignId}/invite-code`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to generate invite code');
  }
  return response.data.inviteCode;
}
