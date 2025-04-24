import api from './axios.mts';
import type { ICampaign, IInvite } from '@dungeon-lab/shared/index.mjs';

export async function getCampaigns(): Promise<ICampaign[]> {
  const response = await api.get('/api/campaigns');
  return response.data;
}

export async function getCampaign(campaignId: string): Promise<ICampaign> {
  const response = await api.get(`/api/campaigns/${campaignId}`);
  return response.data;
}

export async function createCampaign(data: Omit<ICampaign, 'id'>): Promise<ICampaign> {
  const response = await api.post('/api/campaigns', data);
  return response.data;
}

export async function updateCampaign(
  campaignId: string,
  data: Partial<ICampaign>
): Promise<ICampaign> {
  const response = await api.patch(`/api/campaigns/${campaignId}`, data);
  return response.data;
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await api.delete(`/api/campaigns/${campaignId}`);
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
