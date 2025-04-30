import { ApiClient } from './api.client.mjs';
import type { IUser, IUserUpdateData } from '@dungeon-lab/shared/types/index.mjs';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';

export class UsersClient extends ApiClient {
  /**
   * Fetch all users (admin only)
   */
  async fetchUsers(): Promise<IUser[]> {
    const response = await this.api.get<BaseAPIResponse<IUser[]>>('/api/users');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch users');
    }
    return response.data.data;
  }

  /**
   * Fetch a specific user by ID
   */
  async fetchUser(id: string): Promise<IUser> {
    const response = await this.api.get<BaseAPIResponse<IUser>>(`/api/users/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch user');
    }
    return response.data.data;
  }

  /**
   * Update a user's profile
   */
  async updateUser(id: string, data: IUserUpdateData): Promise<IUser> {
    const response = await this.api.patch<BaseAPIResponse<IUser>>(`/api/users/${id}`, data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update user');
    }
    return response.data.data;
  }

  /**
   * Update current user's profile
   */
  async updateCurrentUser(data: IUserUpdateData): Promise<IUser> {
    const response = await this.api.patch<BaseAPIResponse<IUser>>('/api/users/me', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update user');
    }
    return response.data.data;
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await this.api.post<BaseAPIResponse<{ avatarUrl: string }>>(
      '/api/users/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to upload avatar');
    }
    return response.data.data;
  }

  /**
   * Change user password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    const response = await this.api.post<BaseAPIResponse<{ success: boolean }>>(
      '/api/users/change-password',
      {
        currentPassword,
        newPassword
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to change password');
    }
    return response.data.data;
  }

  /**
   * Generate API key for user
   */
  async generateApiKey(): Promise<{ apiKey: string }> {
    const response = await this.api.post<BaseAPIResponse<{ apiKey: string }>>('/api/users/api-key');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to generate API key');
    }
    return response.data.data;
  }
}
