import api from './axios.mts';
import type { ICampaign, IInvite } from '@dungeon-lab/shared/index.mjs';
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

export async function sendInvite(inviteData: IInvite): Promise<Record<string, unknown>> {
  const response = await api.post(`/api/campaign/${inviteData.campaignId}/invites`, inviteData);
  return response.data;
}

export async function getCampaignsByUser(userId: string): Promise<ICampaign[]> {
  const response = await api.get(`/api/users/${userId}/campaigns`);
  return response.data;
}

export async function joinCampaign(campaignId: string, inviteCode: string): Promise<ICampaign> {
  const response = await api.post(`/api/campaigns/${campaignId}/join`, { inviteCode });
  return response.data;
}

export async function leaveCampaign(campaignId: string): Promise<void> {
  await api.post(`/api/campaigns/${campaignId}/leave`);
}

export async function generateInviteCode(campaignId: string): Promise<string> {
  const response = await api.post(`/api/campaigns/${campaignId}/invite-code`);
  return response.data.inviteCode;
}
