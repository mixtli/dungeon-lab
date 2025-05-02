import { ApiClient } from './api.client.mjs';
import type {
  ICampaign,
  ICampaignCreateData,
  ICampaignPatchData
} from '@dungeon-lab/shared/types/index.mjs';
import { BaseAPIResponse, DeleteAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import type { IGameSession } from '@dungeon-lab/shared/types/index.mjs';
import type { IEncounter } from '@dungeon-lab/shared/types/index.mjs';
import type { IInvite } from '@dungeon-lab/shared/types/index.mjs';

export class CampaignsClient extends ApiClient {
  async getCampaigns(): Promise<ICampaign[]> {
    const response = await this.api.get<BaseAPIResponse<ICampaign[]>>('/api/campaigns');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get campaigns');
    }
    return response.data.data;
  }

  async getCampaign(campaignId: string): Promise<ICampaign> {
    const response = await this.api.get<BaseAPIResponse<ICampaign>>(`/api/campaigns/${campaignId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get campaign');
    }
    if (!response.data.data) {
      throw new Error('Campaign not found');
    }
    return response.data.data;
  }

  async createCampaign(data: ICampaignCreateData): Promise<ICampaign> {
    const response = await this.api.post<BaseAPIResponse<ICampaign>>('/api/campaigns', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create campaign');
    }
    if (!response.data.data) {
      throw new Error('Failed to create campaign');
    }
    return response.data.data;
  }

  async updateCampaign(campaignId: string, data: ICampaignPatchData): Promise<ICampaign> {
    const response = await this.api.patch<BaseAPIResponse<ICampaign>>(
      `/api/campaigns/${campaignId}`,
      data
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update campaign');
    }
    if (!response.data.data) {
      throw new Error('Failed to update campaign');
    }
    return response.data.data;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const response = await this.api.delete<DeleteAPIResponse>(`/api/campaigns/${campaignId}`);
    if (response.data && !response.data.success) {
      throw new Error(response.data.error || 'Failed to delete campaign');
    }
  }

  async sendInvite(inviteData: Omit<IInvite, 'id'>): Promise<boolean> {
    const response = await this.api.post<BaseAPIResponse<boolean>>(
      `/api/campaigns/${inviteData.campaignId}/invites`,
      inviteData
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send invite');
    }
    return true;
  }

  async getCampaignsByUser(userId: string): Promise<ICampaign[]> {
    const response = await this.api.get<BaseAPIResponse<ICampaign[]>>(
      `/api/users/${userId}/campaigns`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get user campaigns');
    }
    return response.data.data;
  }

  async joinCampaign(campaignId: string, inviteCode: string): Promise<ICampaign> {
    const response = await this.api.post<BaseAPIResponse<ICampaign>>(
      `/api/campaigns/${campaignId}/join`,
      {
        inviteCode
      }
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to join campaign');
    }
    if (!response.data.data) {
      throw new Error('Failed to join campaign');
    }
    return response.data.data;
  }

  async generateInviteCode(campaignId: string): Promise<IInvite> {
    const response = await this.api.post<BaseAPIResponse<IInvite>>(
      `/api/campaigns/${campaignId}/invites`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate invite code');
    }
    return response.data.data;
  }

  async getActiveCampaignSession(campaignId: string): Promise<IGameSession | null> {
    const response = await this.api.get<BaseAPIResponse<IGameSession | null>>(
      `/api/campaigns/${campaignId}/invites`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get active campaign session');
    }
    return response.data.data;
  }

  /**
   * Gets the active encounter for a campaign if one exists
   */
  async getActiveCampaignEncounter(campaignId: string): Promise<IEncounter | null> {
    const response = await this.api.get<BaseAPIResponse<IEncounter | null>>(
      `/api/campaigns/${campaignId}/active-encounter`
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get active campaign encounter');
    }
    return response.data.data;
  }
}
