import { ApiClient } from './api.client.mjs';
import type { IInvite, InviteStatusType } from '@dungeon-lab/shared/types/index.mjs';
import {
  BaseAPIResponse,
  CreateInviteRequest,
  RespondToInviteRequest
} from '@dungeon-lab/shared/types/api/index.mjs';

/**
 * Client for interacting with campaign invites API
 */
export class InvitesClient extends ApiClient {
  /**
   * Get invites with optional filters
   * @param filters Optional filters for invites (campaignId, status, forCurrentUser)
   */
  async getInvites(filters?: {
    campaignId?: string;
    status?: InviteStatusType;
    forCurrentUser?: boolean;
  }): Promise<IInvite[]> {
    const queryParams = new URLSearchParams();

    if (filters?.campaignId) {
      queryParams.append('campaignId', filters.campaignId);
    }

    if (filters?.status) {
      queryParams.append('status', filters.status);
    }

    if (filters?.forCurrentUser) {
      queryParams.append('forCurrentUser', 'true');
    }

    const queryString = queryParams.toString();
    const url = `/api/invites${queryString ? `?${queryString}` : ''}`;

    const response = await this.api.get<BaseAPIResponse<IInvite[]>>(url);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get invites');
    }

    return response.data.data;
  }

  /**
   * Get invites for the current user
   * Convenience method that calls getInvites with forCurrentUser=true
   */
  async getMyInvites(): Promise<IInvite[]> {
    return this.getInvites({ forCurrentUser: true });
  }

  /**
   * Create a new invite
   * @param data The invite data
   */
  async createInvite(data: CreateInviteRequest): Promise<IInvite> {
    const response = await this.api.post<BaseAPIResponse<IInvite>>('/api/invites', data);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create invite');
    }

    if (!response.data.data) {
      throw new Error('Failed to create invite');
    }

    return response.data.data;
  }

  /**
   * Respond to an invite (accept or decline)
   * @param inviteId The ID of the invite
   * @param data The response data (status and optionally actorId)
   */
  async respondToInvite(inviteId: string, data: RespondToInviteRequest): Promise<IInvite> {
    const response = await this.api.post<BaseAPIResponse<IInvite>>(
      `/api/invites/${inviteId}/respond`,
      data
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to respond to invite');
    }

    if (!response.data.data) {
      throw new Error('Invite not found or already processed');
    }

    return response.data.data;
  }
}
